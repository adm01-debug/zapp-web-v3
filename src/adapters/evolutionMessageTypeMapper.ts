/**
 * Maps Evolution API v2.x raw message types to the normalized types
 * used by the ZAPP WEB frontend (`Message.type` in types/chat.ts).
 *
 * The Evolution API returns message types like 'conversation', 'extendedText',
 * 'imageMessage', 'ptt', etc. The frontend expects a simpler union:
 * 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive' |
 * 'button_response' | 'location' | 'sticker'
 *
 * This mapper ensures all Evolution API types are correctly normalized,
 * preventing rendering issues for unmapped types.
 */

export type FrontendMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'interactive'
  | 'button_response'
  | 'location'
  | 'sticker';

const EVOLUTION_TYPE_MAP: Record<string, FrontendMessageType> = {
  // Text-based
  conversation: 'text',
  extendedTextMessage: 'text',
  extendedText: 'text',
  text: 'text',

  // Image
  imageMessage: 'image',
  image: 'image',

  // Audio
  audioMessage: 'audio',
  audio: 'audio',
  ptt: 'audio', // Push-to-talk (voice note)

  // Video
  videoMessage: 'video',
  video: 'video',

  // Document
  documentMessage: 'document',
  document: 'document',
  documentWithCaptionMessage: 'document',

  // Sticker
  stickerMessage: 'sticker',
  sticker: 'sticker',

  // Location
  locationMessage: 'location',
  location: 'location',
  liveLocationMessage: 'location',

  // Interactive
  listMessage: 'interactive',
  listResponseMessage: 'interactive',
  buttonsMessage: 'interactive',
  interactive: 'interactive',
  templateMessage: 'interactive',
  templateButtonReplyMessage: 'interactive',

  // Button response
  buttonsResponseMessage: 'button_response',
  button_response: 'button_response',
  listResponseRowId: 'button_response',

  // Other media types that map to document
  contactMessage: 'document',
  contactsArrayMessage: 'document',
  protocolMessage: 'text',
  reactionMessage: 'text',
  pollCreationMessage: 'text',
  pollUpdateMessage: 'text',
  editedMessage: 'text',
  viewOnceMessage: 'image',
  viewOnceMessageV2: 'image',
};

/**
 * Normalizes an Evolution API message type to a frontend-safe type.
 *
 * @param rawType The message_type from the Evolution API webhook or DB
 * @returns The normalized FrontendMessageType, defaults to 'text' for unknown types
 */
export function normalizeMessageType(rawType: string | null | undefined): FrontendMessageType {
  if (!rawType) return 'text';

  // Direct match
  const mapped = EVOLUTION_TYPE_MAP[rawType];
  if (mapped) return mapped;

  // Case-insensitive fallback
  const lower = rawType.toLowerCase();
  const lowerMapped = EVOLUTION_TYPE_MAP[lower];
  if (lowerMapped) return lowerMapped;

  // Heuristic fallback for unknown types containing keywords
  if (lower.includes('image') || lower.includes('photo')) return 'image';
  if (lower.includes('video')) return 'video';
  if (lower.includes('audio') || lower.includes('voice') || lower.includes('ptt')) return 'audio';
  if (lower.includes('document') || lower.includes('file')) return 'document';
  if (lower.includes('sticker')) return 'sticker';
  if (lower.includes('location')) return 'location';
  if (lower.includes('button') || lower.includes('list') || lower.includes('interactive')) return 'interactive';

  // Default to text for truly unknown types
  return 'text';
}

/**
 * Checks whether a raw Evolution API type is recognized by the mapper.
 * Useful for logging/monitoring unmapped types in production.
 */
export function isKnownMessageType(rawType: string | null | undefined): boolean {
  if (!rawType) return false;
  return rawType in EVOLUTION_TYPE_MAP || rawType.toLowerCase() in EVOLUTION_TYPE_MAP;
}
