import { describe, it, expect } from 'vitest';
import { formatBRL, parseBRL } from '../currency';

describe('formatBRL', () => {
  it('formata valor positivo', () => {
    expect(formatBRL(1234.56)).toBe('R$ 1.234,56');
  });

  it('formata zero', () => {
    expect(formatBRL(0)).toBe('R$ 0,00');
  });

  it('retorna fallback padrão para null', () => {
    expect(formatBRL(null)).toBe('—');
  });

  it('retorna fallback padrão para undefined', () => {
    expect(formatBRL(undefined)).toBe('—');
  });

  it('retorna fallback customizado', () => {
    expect(formatBRL(null, 'N/D')).toBe('N/D');
  });

  it('retorna fallback para NaN', () => {
    expect(formatBRL(NaN)).toBe('—');
  });
});

describe('parseBRL', () => {
  it('parseia formato brasileiro', () => {
    expect(parseBRL('1.234,56')).toBe(1234.56);
  });

  it('parseia formato decimal simples', () => {
    expect(parseBRL('1234.56')).toBe(1234.56);
  });

  it('parseia com símbolo R$', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(1234.56);
  });

  it('parseia inteiro', () => {
    expect(parseBRL('1000')).toBe(1000);
  });

  it('retorna 0 para string vazia', () => {
    expect(parseBRL('')).toBe(0);
  });

  it('retorna 0 para null', () => {
    expect(parseBRL(null)).toBe(0);
  });

  it('evita imprecisão de ponto flutuante', () => {
    // 0.1 + 0.2 = 0.30000000000000004 em IEEE 754
    // parseBRL deve retornar 0.30 exato
    expect(parseBRL('0,30')).toBe(0.30);
  });

  it('parseia valor mínimo centavo', () => {
    expect(parseBRL('0,01')).toBe(0.01);
  });
});
