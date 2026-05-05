import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mic, Square, X, Send, Pause, Play, Lock, Trash2, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { VoiceChanger } from './VoiceChanger';
import { useIsMobile } from '@/hooks/use-mobile';
import { AudioVolumeControl } from './AudioVolumeControl';

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
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  } = useAudioRecorder({
    onRecordingComplete: (blob) => {
      setAudioBlob(blob);
      setIsConfirming(true);
    },
  });

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

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
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
      {isRecording ? (
        <div className="flex items-center gap-2">
          {!isLocked && isMobile && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
                onClick={handleLock}
                aria-label="Travar gravação"
              >
                <Lock className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              className="bg-destructive hover:bg-destructive/90 shadow-sm"
              onClick={stopRecording}
              aria-label="Parar gravação"
            >
              <Square className="w-4 h-4" />
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
