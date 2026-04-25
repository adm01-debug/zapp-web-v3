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
});
