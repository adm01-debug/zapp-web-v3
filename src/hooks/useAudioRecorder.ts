import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log } from '@/lib/logger';
import { MAX_PTT_DURATION_SEC } from '@/lib/audio/pttLimits';

interface UseAudioRecorderOptions {
  onRecordingComplete?: (audioBlob: Blob, audioUrl: string) => void;
  /** Limite de duração em segundos. Default: limite oficial de PTT (16 min). */
  maxDuration?: number;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { onRecordingComplete, maxDuration = MAX_PTT_DURATION_SEC } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete?.(audioBlob, url);
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      
      intervalRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      log.error('Error starting recording:', error);
      toast({
        title: 'Erro ao gravar',
        description: 'Não foi possível acessar o microfone.',
        variant: 'destructive',
      });
    }
  }, [maxDuration, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      chunksRef.current = [];
      setIsRecording(false);
      setDuration(0);
      setAudioUrl(null);
    }
  }, [isRecording]);

  const uploadAudio = useCallback(async (blob: Blob, conversationId: string) => {
    const fileName = `${conversationId}/${Date.now()}.webm`;
    
    const { data, error } = await supabase.storage
      .from('audio-messages')
      .upload(fileName, blob, {
        contentType: 'audio/webm',
      });
    
    if (error) {
      throw error;
    }
    
    const { data: signedData, error: signError } = await supabase.storage
      .from('audio-messages')
      .createSignedUrl(fileName, 3600); // 1 hour expiry
    
    if (signError || !signedData?.signedUrl) {
      throw signError || new Error('Failed to create signed URL');
    }
    
    return signedData.signedUrl;
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    duration,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    uploadAudio,
    formatDuration,
  };
}
