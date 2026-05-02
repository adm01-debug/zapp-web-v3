import { describe, it, expect } from 'vitest';
import { normalizeMessageType, isKnownMessageType } from '../evolutionMessageTypeMapper';

describe('evolutionMessageTypeMapper', () => {
  describe('normalizeMessageType', () => {
    it('maps text-based Evolution API types to "text"', () => {
      expect(normalizeMessageType('conversation')).toBe('text');
      expect(normalizeMessageType('extendedTextMessage')).toBe('text');
      expect(normalizeMessageType('extendedText')).toBe('text');
      expect(normalizeMessageType('text')).toBe('text');
    });

    it('maps image types correctly', () => {
      expect(normalizeMessageType('imageMessage')).toBe('image');
      expect(normalizeMessageType('image')).toBe('image');
      expect(normalizeMessageType('viewOnceMessage')).toBe('image');
      expect(normalizeMessageType('viewOnceMessageV2')).toBe('image');
    });

    it('maps audio types including PTT', () => {
      expect(normalizeMessageType('audioMessage')).toBe('audio');
      expect(normalizeMessageType('audio')).toBe('audio');
      expect(normalizeMessageType('ptt')).toBe('audio');
    });

    it('maps video types', () => {
      expect(normalizeMessageType('videoMessage')).toBe('video');
      expect(normalizeMessageType('video')).toBe('video');
    });

    it('maps document types', () => {
      expect(normalizeMessageType('documentMessage')).toBe('document');
      expect(normalizeMessageType('document')).toBe('document');
      expect(normalizeMessageType('documentWithCaptionMessage')).toBe('document');
    });

    it('maps sticker types', () => {
      expect(normalizeMessageType('stickerMessage')).toBe('sticker');
      expect(normalizeMessageType('sticker')).toBe('sticker');
    });

    it('maps location types including live location', () => {
      expect(normalizeMessageType('locationMessage')).toBe('location');
      expect(normalizeMessageType('location')).toBe('location');
      expect(normalizeMessageType('liveLocationMessage')).toBe('location');
    });

    it('maps interactive message types', () => {
      expect(normalizeMessageType('listMessage')).toBe('interactive');
      expect(normalizeMessageType('buttonsMessage')).toBe('interactive');
      expect(normalizeMessageType('templateMessage')).toBe('interactive');
      expect(normalizeMessageType('interactive')).toBe('interactive');
    });

    it('maps button response types', () => {
      expect(normalizeMessageType('buttonsResponseMessage')).toBe('button_response');
      expect(normalizeMessageType('button_response')).toBe('button_response');
    });

    it('defaults to "text" for null/undefined', () => {
      expect(normalizeMessageType(null)).toBe('text');
      expect(normalizeMessageType(undefined)).toBe('text');
      expect(normalizeMessageType('')).toBe('text');
    });

    it('uses heuristic fallback for unknown types containing keywords', () => {
      expect(normalizeMessageType('unknownImageType')).toBe('image');
      expect(normalizeMessageType('customVideoMsg')).toBe('video');
      expect(normalizeMessageType('voiceNote')).toBe('audio');
      expect(normalizeMessageType('pdfDocument')).toBe('document');
      expect(normalizeMessageType('animatedSticker')).toBe('sticker');
      expect(normalizeMessageType('sharedLocation')).toBe('location');
    });

    it('defaults to "text" for truly unknown types', () => {
      expect(normalizeMessageType('xyzUnknown123')).toBe('text');
      expect(normalizeMessageType('foobar')).toBe('text');
    });
  });

  describe('isKnownMessageType', () => {
    it('returns true for known types', () => {
      expect(isKnownMessageType('conversation')).toBe(true);
      expect(isKnownMessageType('ptt')).toBe(true);
      expect(isKnownMessageType('imageMessage')).toBe(true);
    });

    it('returns false for unknown types', () => {
      expect(isKnownMessageType('xyzUnknown')).toBe(false);
      expect(isKnownMessageType(null)).toBe(false);
      expect(isKnownMessageType(undefined)).toBe(false);
    });
  });
});
