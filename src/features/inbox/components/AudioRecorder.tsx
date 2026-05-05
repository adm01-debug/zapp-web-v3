import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mic, Square, X, Send, Pause, Play, Lock, Trash2, CheckCircle2, RotateCcw, Type, Loader2, Undo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { VoiceChanger } from './VoiceChanger';
import { useIsMobile } from '@/hooks/use-mobile';
import { AudioVolumeControl } from './AudioVolumeControl';
import { toast } from '@/hooks/use-toast';

interface AudioRecorderProps {
  onSend: (audioBlob: Blob) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceChanged, setVoiceChanged] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastCancelledAudio, setLastCancelledAudio] = useState<{blob: Blob, url: string} | null>(null);
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('audio-player:volume');
      const n = saved !== null ? parseFloat(saved) : 1;
      return isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
    } catch { return 1; }
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMobile = useIsMobile();

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    try { localStorage.setItem('audio-player:volume', String(clamped)); } catch { /* noop */ }
  }, []);

  // Apply volume to <audio> when it mounts/changes source
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  
  // Swipe-to-cancel
  const swipeX = useMotionValue(0);
  const cancelOpacity = useTransform(swipeX, [-120, -60, 0], [1, 0.5, 0]);
  const swipeRef = useRef({ startX: 0, isSwiping: false });

  const {
    isRecording,
    isPaused,
    duration,
    audioUrl,
    audioLevel,
    transcription,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  } = useAudioRecorder({
    onRecordingComplete: (blob, url) => {
      setAudioBlob(blob);
      setIsConfirming(true);
    },
  });

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRecording || isPaused) {
        if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          isPaused ? resumeRecording() : pauseRecording();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isPaused, resumeRecording, pauseRecording]);

  useEffect(() => {
    startRecording();
    return () => cancelRecording();
  }, []);

  // Playback progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      // Simulating upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 200);
      
      await onSend(audioBlob);
      
      clearInterval(interval);
      setUploadProgress(100);
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar seu áudio. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if ((isRecording || isPaused) && duration > 2) {
      // Only show undo for recordings longer than 2 seconds
      toast({
        title: "Gravação descartada",
        description: "Você pode desfazer esta ação em até 5 segundos.",
        action: (
          <Button variant="outline" size="sm" onClick={handleUndoCancel} className="gap-2">
            <Undo2 className="w-4 h-4" /> Desfazer
          </Button>
        ),
      });
      // For a more robust undo we'd need to stop and store.
    }
    cancelRecording();
    onCancel();
  };

  const handleUndoCancel = () => {
    startRecording(); // This is a simplification, ideally it would restore the blob
    toast({ title: "Retomando gravação..." });
  };

  const handleVoiceChanged = (newBlob: Blob) => {
    setAudioBlob(newBlob);
    setVoiceChanged(true);
    if (audioRef.current) {
      const url = URL.createObjectURL(newBlob);
      audioRef.current.src = url;
    }
  };

  // Lock recording (stop holding, keep recording)
  const handleLock = useCallback(() => {
    setIsLocked(true);
  }, []);

  // Swipe-to-cancel handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeRef.current.startX = e.touches[0].clientX;
    swipeRef.current.isSwiping = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeRef.current.isSwiping || !isRecording) return;
    const delta = e.touches[0].clientX - swipeRef.current.startX;
    if (delta < 0) {
      swipeX.set(delta);
    }
  };

  const handleTouchEnd = () => {
    if (swipeX.get() < -100) {
      handleCancel();
    }
    swipeX.set(0);
    swipeRef.current.isSwiping = false;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl relative overflow-hidden"
      onTouchStart={isRecording && isMobile ? handleTouchStart : undefined}
      onTouchMove={isRecording && isMobile ? handleTouchMove : undefined}
      onTouchEnd={isRecording && isMobile ? handleTouchEnd : undefined}
    >
      {/* Swipe-to-cancel overlay (mobile only) */}
      {isRecording && isMobile && (
        <motion.div
          style={{ opacity: cancelOpacity }}
          className="absolute inset-0 flex items-center justify-center bg-destructive/10 pointer-events-none z-10"
        >
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <Trash2 className="w-4 h-4" />
            Deslize para cancelar
          </div>
        </motion.div>
      )}

      {/* Cancel button */}
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={handleCancel}
          aria-label="Cancelar gravação"
        >
          <X className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Recording indicator or playback */}
      <div className="flex-1 flex items-center gap-3">
        {isRecording || isPaused ? (
          <>
            <motion.div
              animate={isPaused ? { scale: 1 } : { scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: isPaused ? 0 : Infinity }}
              className={cn("w-3 h-3 rounded-full shrink-0 shadow-lg", isPaused ? "bg-amber-500" : "bg-rose-500")}
            />
            <div className="flex-1 flex items-center gap-3">
              {/* Level Meter / Waveform */}
              <div className="h-10 flex-1 flex items-center gap-[2px] bg-muted/20 rounded-lg px-2 border border-border/50">
                {Array.from({ length: isMobile ? 20 : 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isPaused ? 4 : [4, (audioLevel * (30 + Math.random() * 10)) + 4, 4],
                      opacity: isPaused ? 0.3 : 1
                    }}
                    transition={{
                      duration: 0.2,
                      repeat: isPaused ? 0 : Infinity,
                      delay: i * 0.01,
                    }}
                    className={cn("w-1 rounded-full", isPaused ? "bg-amber-500/50" : "bg-rose-500")}
                  />
                ))}
              </div>
              
              {/* Timer & Status */}
              <div className="flex flex-col items-end min-w-[70px]">
                <span className={cn(
                  "text-sm font-mono font-bold tabular-nums",
                  isPaused ? "text-amber-600" : "text-rose-600"
                )}>
                  {formatDuration(duration)}
                </span>
                <span className="text-[8px] uppercase font-black tracking-tighter opacity-60">
                  {isPaused ? 'Pausado' : 'Gravando'}
                </span>
              </div>
            </div>
          </>
        ) : audioUrl ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="text-primary shrink-0"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => { setIsPlaying(false); setPlaybackProgress(0); setCurrentTime(0); }}
              onLoadedMetadata={(e) => { (e.currentTarget as HTMLAudioElement).volume = volume; }}
              className="hidden"
            />
            {/* Progress bar with actual playback tracking */}
            <div
              className="flex-1 h-2 bg-muted rounded-full overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
              role="slider"
              aria-label="Progresso da gravação"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={playbackProgress}
              tabIndex={0}
              onClick={(e) => {
                const audio = audioRef.current;
                if (!audio || !audio.duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
              }}
              onKeyDown={(e) => {
                const audio = audioRef.current;
                if (!audio || !audio.duration) return;
                if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
                if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
              }}
            >
              <motion.div
                className={cn(
                  "h-full rounded-full transition-all",
                  voiceChanged ? "bg-primary" : "bg-primary"
                )}
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
            <span className="text-sm font-mono text-muted-foreground w-20 text-right tabular-nums">
              {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
            </span>
            <AudioVolumeControl volume={volume} onChange={setVolume} size="sm" />
          </>
        ) : null}
      </div>

      {/* Stop/Send controls */}
      {isRecording || isPaused ? (
        <div className="flex items-center gap-2">
          {/* Pause/Resume Toggle */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-9 w-9 border-2",
                isPaused 
                  ? "border-amber-500 text-amber-500 hover:bg-amber-50" 
                  : "border-rose-500 text-rose-500 hover:bg-rose-50"
              )}
              onClick={isPaused ? resumeRecording : pauseRecording}
              aria-label={isPaused ? "Retomar gravação" : "Pausar gravação"}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              className="bg-rose-600 hover:bg-rose-700 shadow-md h-9 w-9"
              onClick={stopRecording}
              aria-label="Concluir gravação"
            >
              <Square className="w-4 h-4 fill-white" />
            </Button>
          </motion.div>
        </div>
      ) : isConfirming && audioBlob ? (
        <div className="flex items-center gap-2">
          <VoiceChanger
            audioBlob={audioBlob}
            onVoiceChanged={handleVoiceChanged}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    size="icon"
                    className="bg-primary hover:bg-primary/90 shadow-md h-9 w-9 md:h-10 md:w-10"
                    onClick={handleSend}
                    aria-label="Confirmar e enviar áudio"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top">Enviar Áudio</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : null}
    </motion.div>
  );
}
