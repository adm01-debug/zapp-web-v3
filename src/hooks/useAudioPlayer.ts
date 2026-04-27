import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { MediaRefreshKey } from '@/types/mediaRefresh';
import { volumeStore } from '@/hooks/realtime/volumeStore';

interface UseAudioPlayerOptions {
  audioUrl: string;
  messageId: string;
  /** Optional Evolution refresh key — enables `getMediaBase64` fallback when the URL expires (410/403). */
  refreshKey?: MediaRefreshKey;
  /**
   * Conversation scope (ex: remoteJid). Quando presente, o volume é resolvido
   * via `volumeStore.getEffective(conversationId)` — aplicando override por
   * conversa quando existir, senão usa o global. Mudanças em qualquer player
   * da MESMA conversa propagam imediatamente via subscribe.
   */
  conversationId?: string | null;
}

export function useAudioPlayer({ audioUrl, messageId, refreshKey, conversationId }: UseAudioPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string>(audioUrl);
  const [volume, setVolumeState] = useState<number>(() =>
    volumeStore.getEffective(conversationId)
  );
  /** Indica se este player está usando override por conversa (UI badge). */
  const [hasConversationOverride, setHasConversationOverride] = useState<boolean>(
    () => Boolean(conversationId && volumeStore.getConversation(conversationId) !== null)
  );
  const audioRef = useRef<HTMLAudioElement>(null);

  /**
   * Define volume aplicando ao escopo correto:
   *  - Se há `conversationId`, salva como override da conversa.
   *  - Senão, salva como global.
   * Em ambos os casos atualiza o player local (via subscribe + apply effect).
   */
  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    if (conversationId) {
      volumeStore.setConversation(conversationId, clamped);
    } else {
      volumeStore.setGlobal(clamped);
    }
  }, [conversationId]);

  /** Promove o volume atual a default global e remove o override da conversa. */
  const promoteVolumeToGlobal = useCallback(() => {
    volumeStore.setGlobal(volume);
    if (conversationId) volumeStore.clearConversation(conversationId);
  }, [volume, conversationId]);

  /** Remove override da conversa, voltando ao global. */
  const resetConversationVolume = useCallback(() => {
    if (conversationId) volumeStore.clearConversation(conversationId);
  }, [conversationId]);

  // Subscribe à store: qualquer mudança que afete este escopo re-aplica.
  useEffect(() => {
    const apply = () => {
      const next = volumeStore.getEffective(conversationId);
      setVolumeState(next);
      setHasConversationOverride(
        Boolean(conversationId && volumeStore.getConversation(conversationId) !== null)
      );
    };
    apply(); // sincroniza inicialmente caso conversationId mude
    const unsub = volumeStore.subscribe((_v, scope, convId) => {
      if (scope === 'global') return apply();
      if (scope === 'conversation' && convId === conversationId) return apply();
    });
    return unsub;
  }, [conversationId]);

  // Apply volume whenever audio element re-mounts or volume changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, resolvedUrl]);

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
    let urlExpired = false;
    try {
      const resp = await fetch(url, { method: 'HEAD', mode: 'cors' });
      if (resp.ok) return url;
      // 410 Gone / 403 Forbidden are typical WhatsApp URL expirations.
      if (resp.status === 410 || resp.status === 403 || resp.status === 404) urlExpired = true;
    } catch (err) { log.error('Unexpected error in useAudioPlayer:', err); }

    // Try to find the file in known buckets by messageId (storage fallback)
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

    // Last resort: ask Evolution for a fresh base64 payload (works for any
    // expired WhatsApp media as long as we have the original message key).
    if (refreshKey && urlExpired) {
      try {
        const { data, error } = await supabase.functions.invoke('evolution-api/get-media-base64', {
          method: 'POST',
          body: {
            instanceName: refreshKey.instanceName,
            message: { key: { remoteJid: refreshKey.remoteJid, fromMe: refreshKey.fromMe, id: refreshKey.id } },
          },
        });
        if (!error) {
          const payload = (data as { base64?: string; mimetype?: string } | null) ?? null;
          if (payload?.base64) {
            const mime = payload.mimetype || 'audio/ogg';
            return `data:${mime};base64,${payload.base64}`;
          }
        }
      } catch (err) {
        log.error('Evolution audio refresh failed:', err);
      }
    }

    return url;
  }, [messageId, refreshKey]);

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
    volume, setVolume,
    togglePlay, handleSeek, cycleSpeed, formatTime, resolveAudioUrl,
  };
}
