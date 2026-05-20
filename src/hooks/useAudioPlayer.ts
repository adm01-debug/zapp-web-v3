import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UseAudioPlayerOptions {
  audioUrl: string;
  messageId: string;
}

export function useAudioPlayer({ audioUrl, messageId }: UseAudioPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string>(audioUrl);
  const audioRef = useRef<HTMLAudioElement>(null);

  const waveformHeights = useMemo(
    () => Array.from({ length: 30 }, () => Math.random() * 60 + 20),
    []
  );

  const resolveAudioUrl = useCallback(async (url: string): Promise<string> => {
    if (url.includes('/storage/v1/')) {
      try {
        const buckets = ['whatsapp-media', 'audio-messages'];
        for (const bucket of buckets) {
          const marker = `/${bucket}/`;
          const idx = url.indexOf(marker);
          if (idx !== -1) {
            const pathWithQuery = url.substring(idx + marker.length);
            const path = decodeURIComponent(pathWithQuery.split('?')[0]);
            const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
            if (data?.signedUrl) return data.signedUrl;
          }
        }
      } catch (e) {
        log.error('Failed to refresh signed URL:', e);
      }
    }

    // Try a HEAD check to see if the URL is reachable
    try {
      const resp = await fetch(url, { method: 'HEAD', mode: 'cors' });
      if (resp.ok) return url;
    } catch (err) { log.error('Unexpected error in useAudioPlayer:', err); }

    // Last resort: try to find the file in known buckets by messageId
    try {
      const buckets = ['whatsapp-media', 'audio-messages'];
      for (const bucket of buckets) {
        const { data: files } = await supabase.storage.from(bucket).list('', { search: messageId, limit: 5 });
        if (files && files.length > 0) {
          const { data } = await supabase.storage.from(bucket).createSignedUrl(files[0].name, 3600);
          if (data?.signedUrl) return data.signedUrl;
        }
      }
    } catch (err) { log.error('Unexpected error in useAudioPlayer:', err); }

    return url;
  }, [messageId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const d = audio.duration;
      setDuration(isFinite(d) && !isNaN(d) ? d : 0);
      setIsLoading(false);
      setHasError(false);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };
    const handleError = () => { log.error('Audio error:', messageId); setIsPlaying(false); setIsLoading(false); setHasError(true); };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [resolvedUrl, messageId]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) { audio.pause(); setIsPlaying(false); return; }

    if (hasError) {
      setIsLoading(true); setHasError(false);
      try {
        const freshUrl = await resolveAudioUrl(audioUrl);
        setResolvedUrl(freshUrl); audio.src = freshUrl; audio.load();
      } catch {
        setHasError(true); setIsLoading(false);
        toast({ title: 'Erro ao carregar áudio', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);
    try {
      await audio.play(); setIsPlaying(true); setIsLoading(false); setHasError(false);
    } catch {
      setIsPlaying(false);
      try {
        const freshUrl = await resolveAudioUrl(audioUrl);
        if (freshUrl !== resolvedUrl) {
          setResolvedUrl(freshUrl); audio.src = freshUrl; audio.load();
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => { cleanup(); reject(); }, 15000);
            const cleanup = () => { audio.removeEventListener('canplay', onCanPlay); audio.removeEventListener('error', onErr); clearTimeout(timeout); };
            const onCanPlay = () => { cleanup(); resolve(); };
            const onErr = () => { cleanup(); reject(); };
            audio.addEventListener('canplay', onCanPlay); audio.addEventListener('error', onErr);
          });
          await audio.play(); setIsPlaying(true); setIsLoading(false); setHasError(false);
        } else {
          setIsLoading(false); setHasError(true);
          toast({ title: 'Erro ao reproduzir', description: 'O arquivo de áudio expirou ou foi removido. Tente recarregar a conversa.', variant: 'destructive' });
        }
      } catch {
        setIsLoading(false); setHasError(true);
        toast({ title: 'Erro ao reproduzir', description: 'Não foi possível carregar o áudio. Verifique sua conexão.', variant: 'destructive' });
      }
    }
  }, [isPlaying, hasError, audioUrl, resolvedUrl, resolveAudioUrl]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const speeds = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) audioRef.current.playbackRate = newRate;
  }, [playbackRate]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  };

  return {
    audioRef, resolvedUrl, isPlaying, isLoading, hasError,
    playbackRate, progress, duration, currentTime, waveformHeights,
    togglePlay, handleSeek, cycleSpeed, formatTime, resolveAudioUrl,
  };
}
