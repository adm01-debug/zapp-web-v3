import { describe, it, expect } from 'vitest';
import {
  toNumber,
  toPhone,
  toJid,
  toIndividualJid,
  toGroupJid,
  isGroup,
  isBroadcast,
  isStatus,
  isStatusBroadcast,
  isIndividual,
  isNewsletter,
  ensureBrazilDDI,
  JID_SUFFIXES,
  isValidPhone,
  isValidJid,
  isValidIndividualJid,
  isValidGroupJid,
  isValidBroadcastJid,
  isValidNewsletterJid,
  assertValidJid,
  toPhoneStrict,
  toJidStrict,
} from '@/lib/jid';

describe('jid helpers', () => {
  describe('toNumber / toPhone', () => {
    it('é um alias de toPhone', () => {
      expect(toNumber).toBe(toPhone);
    });

    it.each([
      ['5511999999999@s.whatsapp.net', '5511999999999'],
      ['120363999999999999@g.us', '120363999999999999'],
      ['+55 (11) 99999-9999', '5511999999999'],
      ['status@broadcast', ''],
      ['  5511 99999 9999  ', '5511999999999'],
      ['abc', ''],
    ])('toNumber(%s) → %s', (input, expected) => {
      expect(toNumber(input)).toBe(expected);
    });

    it.each([null, undefined, ''])('retorna string vazia para %s', (v) => {
      expect(toNumber(v as unknown as string)).toBe('');
    });
  });

  describe('toJid', () => {
    it('preserva sufixo individual', () => {
      expect(toJid('5511999999999@s.whatsapp.net')).toBe('5511999999999@s.whatsapp.net');
    });

    it('preserva sufixo de grupo', () => {
      expect(toJid('120363@g.us')).toBe('120363@g.us');
    });

    it('preserva broadcast', () => {
      expect(toJid('status@broadcast')).toBe('status@broadcast');
    });

    it('preserva newsletter', () => {
      expect(toJid('123@newsletter')).toBe('123@newsletter');
    });

    it('assume individual quando recebe número puro', () => {
      expect(toJid('5511999999999')).toBe('5511999999999@s.whatsapp.net');
    });

    it('normaliza número formatado para JID individual', () => {
      expect(toJid('+55 (11) 99999-9999')).toBe('5511999999999@s.whatsapp.net');
    });

    it.each([null, undefined, ''])('retorna string vazia para %s', (v) => {
      expect(toJid(v as unknown as string)).toBe('');
    });
  });

  describe('toIndividualJid / toGroupJid', () => {
    it('toIndividualJid descarta sufixo de grupo e força @s.whatsapp.net', () => {
      expect(toIndividualJid('120363@g.us')).toBe('120363@s.whatsapp.net');
    });

    it('toGroupJid mantém @g.us e converte número solto', () => {
      expect(toGroupJid('120363@g.us')).toBe('120363@g.us');
      expect(toGroupJid('120363')).toBe('120363@g.us');
      expect(toGroupJid('')).toBe('');
    });
  });

  describe('detectores', () => {
    it('isGroup', () => {
      expect(isGroup('120363@g.us')).toBe(true);
      expect(isGroup('5511999999999@s.whatsapp.net')).toBe(false);
      expect(isGroup(null)).toBe(false);
      expect(isGroup(undefined)).toBe(false);
      expect(isGroup('')).toBe(false);
    });

    it('isStatusBroadcast é alias de isStatus e bate só em status@broadcast', () => {
      expect(isStatusBroadcast).toBe(isStatus);
      expect(isStatusBroadcast('status@broadcast')).toBe(true);
      expect(isStatusBroadcast('1234@broadcast')).toBe(false);
      expect(isStatusBroadcast('5511@s.whatsapp.net')).toBe(false);
      expect(isStatusBroadcast(null)).toBe(false);
    });

    it('isBroadcast cobre qualquer @broadcast (inclui status)', () => {
      expect(isBroadcast('status@broadcast')).toBe(true);
      expect(isBroadcast('1234@broadcast')).toBe(true);
      expect(isBroadcast('120363@g.us')).toBe(false);
    });

    it('isIndividual e isNewsletter', () => {
      expect(isIndividual('5511@s.whatsapp.net')).toBe(true);
      expect(isIndividual('120363@g.us')).toBe(false);
      expect(isNewsletter('xyz@newsletter')).toBe(true);
      expect(isNewsletter('xyz@g.us')).toBe(false);
    });
  });

  describe('ensureBrazilDDI', () => {
    it('mantém DDI 55 quando já presente e completo', () => {
      expect(ensureBrazilDDI('5511999999999')).toBe('5511999999999');
    });

    it('prepende 55 quando ausente', () => {
      expect(ensureBrazilDDI('11999999999')).toBe('5511999999999');
    });

    it('prepende 55 mesmo quando começa com 55 mas é curto demais (ambíguo)', () => {
      // 55 + 8 dígitos não é um celular BR válido — função adiciona prefixo defensivamente
      expect(ensureBrazilDDI('5512345')).toBe('555512345');
    });

    it('retorna vazio para entrada inválida', () => {
      expect(ensureBrazilDDI('')).toBe('');
      expect(ensureBrazilDDI('abc')).toBe('');
    });
  });

  describe('JID_SUFFIXES', () => {
    it('expõe constantes esperadas', () => {
      expect(JID_SUFFIXES.individual).toBe('@s.whatsapp.net');
      expect(JID_SUFFIXES.group).toBe('@g.us');
      expect(JID_SUFFIXES.broadcast).toBe('@broadcast');
      expect(JID_SUFFIXES.newsletter).toBe('@newsletter');
      expect(JID_SUFFIXES.status).toBe('status@broadcast');
    });
  });

  describe('type guards estritos', () => {
    it('isValidPhone aceita só dígitos 8-15', () => {
      expect(isValidPhone('5511999999999')).toBe(true);
      expect(isValidPhone('12345678')).toBe(true);
      expect(isValidPhone('1234567')).toBe(false); // curto
      expect(isValidPhone('1234567890123456')).toBe(false); // longo
      expect(isValidPhone('+5511999999999')).toBe(false); // não normalizado
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone(null)).toBe(false);
      expect(isValidPhone(undefined)).toBe(false);
      expect(isValidPhone(5511999999999)).toBe(false);
    });

    it('isValidIndividualJid', () => {
      expect(isValidIndividualJid('5511999999999@s.whatsapp.net')).toBe(true);
      expect(isValidIndividualJid('5511999999999')).toBe(false);
      expect(isValidIndividualJid('abc@s.whatsapp.net')).toBe(false);
      expect(isValidIndividualJid('120363@g.us')).toBe(false);
    });

    it('isValidGroupJid', () => {
      expect(isValidGroupJid('120363999999999999@g.us')).toBe(true);
      expect(isValidGroupJid('5511999999999-1700000000@g.us')).toBe(true);
      expect(isValidGroupJid('@g.us')).toBe(false);
      expect(isValidGroupJid('5511999999999@s.whatsapp.net')).toBe(false);
      expect(isValidGroupJid('abc@g.us')).toBe(false);
    });

    it('isValidBroadcastJid e isValidNewsletterJid', () => {
      expect(isValidBroadcastJid('status@broadcast')).toBe(true);
      expect(isValidBroadcastJid('1234@broadcast')).toBe(true);
      expect(isValidBroadcastJid('@broadcast')).toBe(false);
      expect(isValidNewsletterJid('xyz@newsletter')).toBe(true);
      expect(isValidNewsletterJid('@newsletter')).toBe(false);
    });

    it('isValidJid agrega todos os tipos reconhecidos', () => {
      expect(isValidJid('5511999999999@s.whatsapp.net')).toBe(true);
      expect(isValidJid('120363@g.us')).toBe(true);
      expect(isValidJid('status@broadcast')).toBe(true);
      expect(isValidJid('xyz@newsletter')).toBe(true);
      expect(isValidJid('5511999999999')).toBe(false);
      expect(isValidJid('lixo')).toBe(false);
      expect(isValidJid(null)).toBe(false);
    });

    it('assertValidJid lança em entrada inválida', () => {
      expect(() => assertValidJid('5511999999999@s.whatsapp.net')).not.toThrow();
      expect(() => assertValidJid('lixo', 'remoteJid')).toThrow(/Invalid JID for remoteJid/);
      expect(() => assertValidJid(null)).toThrow();
    });

    it('toPhoneStrict retorna null para entrada inválida', () => {
      expect(toPhoneStrict('5511999999999')).toBe('5511999999999');
      expect(toPhoneStrict('+55 (11) 99999-9999')).toBe('5511999999999');
      expect(toPhoneStrict('abc')).toBeNull();
      expect(toPhoneStrict('')).toBeNull();
      expect(toPhoneStrict(null)).toBeNull();
      expect(toPhoneStrict('123')).toBeNull(); // curto
    });

    it('toJidStrict preserva JIDs válidos e converte números válidos', () => {
      expect(toJidStrict('5511999999999@s.whatsapp.net')).toBe('5511999999999@s.whatsapp.net');
      expect(toJidStrict('120363@g.us')).toBe('120363@g.us');
      expect(toJidStrict('status@broadcast')).toBe('status@broadcast');
      expect(toJidStrict('5511999999999')).toBe('5511999999999@s.whatsapp.net');
      expect(toJidStrict('+55 (11) 99999-9999')).toBe('5511999999999@s.whatsapp.net');
      expect(toJidStrict('lixo')).toBeNull();
      expect(toJidStrict('123')).toBeNull();
      expect(toJidStrict(null)).toBeNull();
      expect(toJidStrict('')).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Cobertura ampliada: DDIs internacionais + caracteres incomuns
  // ──────────────────────────────────────────────────────────────────────

  describe('DDIs internacionais (fora do BR)', () => {
    // Pares (input formatado, dígitos esperados) — cobre os principais DDIs
    // que aparecem em integrações reais com Evolution API.
    const cases: Array<[string, string, string]> = [
      // [label, input, expectedDigits]
      ['US (+1)', '+1 (415) 555-0132', '14155550132'],
      ['UK (+44)', '+44 20 7946 0958', '442079460958'],
      ['Portugal (+351)', '+351 912 345 678', '351912345678'],
      ['Spain (+34)', '+34 612 34 56 78', '34612345678'],
      ['Germany (+49)', '+49 30 1234567', '49301234567'],
      ['France (+33)', '+33 6 12 34 56 78', '33612345678'],
      ['Argentina (+54 9)', '+54 9 11 1234-5678', '5491112345678'],
      ['Mexico (+52)', '+52 55 1234 5678', '525512345678'],
      ['Japan (+81)', '+81 3-1234-5678', '81312345678'],
      ['India (+91)', '+91 98765 43210', '919876543210'],
      ['China (+86)', '+86 138 0013 8000', '8613800138000'],
      ['Israel (+972)', '+972 50-123-4567', '972501234567'],
    ];

    it.each(cases)('toPhone(%s) extrai apenas dígitos', (_label, input, expected) => {
      expect(toPhone(input)).toBe(expected);
    });

    it.each(cases)('toJid(%s) → <digits>@s.whatsapp.net', (_label, input, expected) => {
      expect(toJid(input)).toBe(`${expected}@s.whatsapp.net`);
    });

    it.each(cases)('toJidStrict(%s) valida e devolve JID canônico', (_label, input, expected) => {
      // Todos os casos têm 8-15 dígitos → devem passar no guard estrito.
      expect(toJidStrict(input)).toBe(`${expected}@s.whatsapp.net`);
      expect(isValidIndividualJid(`${expected}@s.whatsapp.net`)).toBe(true);
    });

    it('ensureBrazilDDI NÃO re-prefixa números que já começam com 55 e têm tamanho válido', () => {
      // Defensivo: para DDIs estrangeiros sem 55, a função adiciona 55 (comportamento documentado).
      // Aqui só fixamos o caso "começa com 55 e ≥12 dígitos" → preserva.
      expect(ensureBrazilDDI('5511999999999')).toBe('5511999999999');
    });

    it('ensureBrazilDDI prepende 55 a DDIs estrangeiros (limitação documentada)', () => {
      // A função é BR-first: se o número não começa com 55, ela prefixa 55.
      // Este teste fixa o contrato para evitar regressão silenciosa.
      expect(ensureBrazilDDI('+1 (415) 555-0132')).toBe('5514155550132');
      expect(ensureBrazilDDI('+44 20 7946 0958')).toBe('55442079460958');
    });

    it('toPhoneStrict aceita DDIs internacionais dentro de 8-15 dígitos', () => {
      expect(toPhoneStrict('+1 (415) 555-0132')).toBe('14155550132');
      expect(toPhoneStrict('+44 20 7946 0958')).toBe('442079460958');
      expect(toPhoneStrict('+86 138 0013 8000')).toBe('8613800138000');
    });

    it('toPhoneStrict rejeita números que extrapolam 15 dígitos após normalizar', () => {
      // E.164 limita a 15 dígitos; entradas maiores devem virar null.
      expect(toPhoneStrict('+1234567890123456')).toBeNull(); // 16
      expect(toJidStrict('+1234567890123456')).toBeNull();
    });
  });

  describe('caracteres incomuns / whitespace', () => {
    // Tabela determinística: cada input deve produzir EXATAMENTE o output.
    // Cobre tab, newline, CR, espaços múltiplos, NBSP, zero-width, RTL,
    // BOM, e separadores Unicode comuns em copy-paste de planilhas/PDFs.
    const NBSP = '\u00A0';
    const ZWSP = '\u200B';
    const ZWNJ = '\u200C';
    const ZWJ = '\u200D';
    const LRM = '\u200E';
    const RLM = '\u200F';
    const BOM = '\uFEFF';
    const NARROW_NBSP = '\u202F';
    const FIGURE_SPACE = '\u2007';

    const phoneCases: Array<[string, string, string]> = [
      ['tab', '\t5511999999999\t', '5511999999999'],
      ['newline', '\n5511999999999\n', '5511999999999'],
      ['CRLF', '\r\n5511999999999\r\n', '5511999999999'],
      ['espaços múltiplos', '   55   11   99999   9999   ', '5511999999999'],
      ['mistura tab+espaço', ' \t55\t 11\t99999\t9999 \t', '5511999999999'],
      ['NBSP', `55${NBSP}11${NBSP}99999${NBSP}9999`, '5511999999999'],
      ['narrow NBSP', `55${NARROW_NBSP}11${NARROW_NBSP}99999${NARROW_NBSP}9999`, '5511999999999'],
      ['figure space', `55${FIGURE_SPACE}11${FIGURE_SPACE}99999${FIGURE_SPACE}9999`, '5511999999999'],
      ['zero-width space', `5511${ZWSP}999999999`, '5511999999999'],
      ['ZWNJ/ZWJ', `5511${ZWNJ}9999${ZWJ}99999`, '5511999999999'],
      ['LRM/RLM', `${LRM}+55 11 99999-9999${RLM}`, '5511999999999'],
      ['BOM no início', `${BOM}5511999999999`, '5511999999999'],
      ['parênteses + traços', '(55) 11-99999-9999', '5511999999999'],
      ['formato DDD com hífen', '+55-11-99999-9999', '5511999999999'],
      ['letras intercaladas (lixo)', '55a11b99999c9999', '5511999999999'],
    ];

    it.each(phoneCases)('toPhone(%s) é determinístico', (_label, input, expected) => {
      expect(toPhone(input)).toBe(expected);
    });

    it.each(phoneCases)('toJid(%s) gera JID individual canônico', (_label, input, expected) => {
      expect(toJid(input)).toBe(`${expected}@s.whatsapp.net`);
    });

    it.each(phoneCases)('toPhoneStrict(%s) aceita após sanitizar', (_label, input, expected) => {
      expect(toPhoneStrict(input)).toBe(expected);
    });

    it('idempotência: aplicar toPhone duas vezes produz o mesmo resultado', () => {
      for (const [, input] of phoneCases) {
        const once = toPhone(input);
        expect(toPhone(once)).toBe(once);
      }
    });

    it('idempotência: aplicar toJid duas vezes produz o mesmo resultado', () => {
      for (const [, input] of phoneCases) {
        const once = toJid(input);
        expect(toJid(once)).toBe(once);
      }
    });

    it('determinismo: chamadas repetidas com a mesma entrada retornam saídas idênticas', () => {
      // Sanity contra qualquer dependência implícita de estado/locale/Date.
      const sample = ` \t+55 (11)\u00A099999-9999\n`;
      const a = toJid(sample);
      const b = toJid(sample);
      const c = toJid(sample);
      expect(a).toBe(b);
      expect(b).toBe(c);
      expect(a).toBe('5511999999999@s.whatsapp.net');
    });

    it('strings só com whitespace/zero-width retornam vazio (e null em variantes estritas)', () => {
      const blanks = [
        '   ',
        '\t\t\t',
        '\n\r\n',
        `${NBSP}${NARROW_NBSP}${FIGURE_SPACE}`,
        `${ZWSP}${ZWNJ}${ZWJ}`,
        `${BOM}${LRM}${RLM}`,
      ];
      for (const b of blanks) {
        expect(toPhone(b)).toBe('');
        expect(toJid(b)).toBe('');
        expect(toPhoneStrict(b)).toBeNull();
        expect(toJidStrict(b)).toBeNull();
      }
    });

    it('JIDs com whitespace ao redor: toPhone limpa, mas toJidStrict é estrito', () => {
      // `toJidStrict` checa `isValidJid(raw)` ANTES de normalizar — strings com
      // whitespace ao redor não casam com a regex e caem no fallback de telefone.
      const jidComEspaco = '  5511999999999@s.whatsapp.net  ';
      expect(toPhone(jidComEspaco)).toBe('5511999999999');
      // Fallback: extrai dígitos da parte antes do '@' → '5511999999999' válido.
      expect(toJidStrict(jidComEspaco)).toBe('5511999999999@s.whatsapp.net');
      // Já o guard direto rejeita por causa dos espaços:
      expect(isValidIndividualJid(jidComEspaco)).toBe(false);
    });

    it('entradas extremas não lançam exceção', () => {
      const evil = [
        '\u0000\u0000\u0000',
        '🤖🚀✨',
        'a'.repeat(10_000),
        '5'.repeat(10_000),
        `${BOM}${ZWSP}${NBSP}\t\n\r `,
      ];
      for (const e of evil) {
        expect(() => toPhone(e)).not.toThrow();
        expect(() => toJid(e)).not.toThrow();
        expect(() => toPhoneStrict(e)).not.toThrow();
        expect(() => toJidStrict(e)).not.toThrow();
      }
      // 10k dígitos extrapola 8-15 → strict deve devolver null.
      expect(toPhoneStrict('5'.repeat(10_000))).toBeNull();
      expect(toJidStrict('5'.repeat(10_000))).toBeNull();
    });
  });
});
