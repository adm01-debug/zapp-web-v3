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
});
