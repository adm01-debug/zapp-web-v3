/**
 * Stress Test — type definitions shared between runner, samplers and UI.
 */

export type StressTaskType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio_voice'
  | 'audio_meme'
  | 'sticker'
  | 'document'
  | 'location';

export const ALL_STRESS_TYPES: StressTaskType[] = [
  'text', 'image', 'video', 'audio_voice', 'audio_meme', 'sticker', 'document', 'location',
];

export const STRESS_TYPE_LABEL: Record<StressTaskType, string> = {
  text: 'Texto',
  image: 'Imagem',
  video: 'Vídeo',
  audio_voice: 'Áudio (voz/PTT)',
  audio_meme: 'Áudio meme',
  sticker: 'Sticker',
  document: 'Documento (PDF)',
  location: 'Localização',
};

export interface StressResult {
  idx: number;
  type: StressTaskType;
  status: 'ok' | 'fail';
  ms: number;
  error?: string;
  messageId?: string;
  /** Detalhe leve do payload (ex.: nome do sticker, primeiros 40 chars de texto). */
  detail?: string;
  ts: number;
}

export type StressRunStatus = 'idle' | 'running' | 'completed' | 'aborted' | 'failed';
