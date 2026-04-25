// Cobertura mínima do extractor universal de messageTypes (blueprint Baileys/
// Evolution v2). Garante que (1) os 18 tipos canônicos resolvem para o
// descritor correto, (2) os aliases curtos legados ainda funcionam e (3)
// tipos desconhecidos caem no fallback diagnóstico preservando `rawType`.
import { describe, it, expect } from 'vitest';
import { extractMessageType } from '@/adapters/evolutionAdapter';

describe('extractMessageType — blueprint dos 18 messageTypes', () => {
  const supported = [
    ['conversation', 'text', 'text'],
    ['extendedTextMessage', 'text', 'text'],
    ['imageMessage', 'image', 'media'],
    ['videoMessage', 'video', 'media'],
    ['audioMessage', 'audio', 'media'],
    ['documentMessage', 'document', 'media'],
    ['stickerMessage', 'sticker', 'media'],
    ['locationMessage', 'location', 'location'],
    ['liveLocationMessage', 'location', 'location'],
    ['buttonsMessage', 'interactive', 'interactive'],
    ['listMessage', 'interactive', 'interactive'],
    ['templateMessage', 'interactive', 'interactive'],
  ] as const;

  it.each(supported)('marca %s como supported (%s/%s)', (raw, internal, category) => {
    const r = extractMessageType(raw);
    expect(r.rawType).toBe(raw);
    expect(r.internalType).toBe(internal);
    expect(r.category).toBe(category);
    expect(r.supported).toBe(true);
    expect(r.label).toBeTruthy();
  });

  const unsupported = [
    ['contactMessage', 'contact'],
    ['contactsArrayMessage', 'contact'],
    ['pollCreationMessage', 'poll'],
    ['pollUpdateMessage', 'poll'],
    ['reactionMessage', 'reaction'],
    ['viewOnceMessage', 'media'],
  ] as const;

  it.each(unsupported)('marca %s como unsupported na categoria %s', (raw, category) => {
    const r = extractMessageType(raw);
    expect(r.internalType).toBe('unsupported');
    expect(r.category).toBe(category);
    expect(r.supported).toBe(false);
    expect(r.label).toBeTruthy();
  });

  it('totaliza 18 tipos no blueprint (12 supported + 6 unsupported)', () => {
    expect(supported.length + unsupported.length).toBe(18);
  });
});

describe('extractMessageType — aliases curtos legados', () => {
  it.each([
    ['text', 'text', 'conversation'],
    ['image', 'image', 'imageMessage'],
    ['video', 'video', 'videoMessage'],
    ['audio', 'audio', 'audioMessage'],
    ['document', 'document', 'documentMessage'],
    ['sticker', 'sticker', 'stickerMessage'],
    ['location', 'location', 'locationMessage'],
    ['interactive', 'interactive', 'buttonsMessage'],
  ] as const)('alias "%s" → internalType "%s" (rawType preservado)', (alias, internal) => {
    const r = extractMessageType(alias);
    expect(r.internalType).toBe(internal);
    expect(r.supported).toBe(true);
    // O rawType deve refletir o que veio do wire, não a chave canônica.
    expect(r.rawType).toBe(alias);
  });
});

describe('extractMessageType — fallback diagnóstico', () => {
  it('vazio/undefined/null → text default', () => {
    for (const v of [undefined, null, '', '   ']) {
      const r = extractMessageType(v);
      expect(r.internalType).toBe('text');
      expect(r.supported).toBe(true);
    }
  });

  it('tipo desconhecido → unsupported + category="unknown" + rawType preservado', () => {
    const r = extractMessageType('orderMessage');
    expect(r.rawType).toBe('orderMessage');
    expect(r.internalType).toBe('unsupported');
    expect(r.category).toBe('unknown');
    expect(r.supported).toBe(false);
    // Para unknown, o label expõe a chave bruta para diagnóstico operacional.
    expect(r.label).toBe('orderMessage');
  });

  it('faz trim antes de classificar', () => {
    expect(extractMessageType('  imageMessage  ').internalType).toBe('image');
  });
});
