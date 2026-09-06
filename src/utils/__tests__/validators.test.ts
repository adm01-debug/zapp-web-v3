import { describe, it, expect } from 'vitest';
import {
  isValidCPF, formatCPF,
  isValidCNPJ, formatCNPJ,
  isValidCEP, formatCEP,
  isValidPhoneBR,
} from '../validators';

describe('CPF', () => {
  it('aceita CPF válido', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('52998224725')).toBe(true);
  });

  it('rejeita CPF com todos dígitos iguais', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false);
  });

  it('rejeita CPF com dígitos verificadores errados', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false);
  });

  it('rejeita CPF com comprimento errado', () => {
    expect(isValidCPF('123')).toBe(false);
  });

  it('formata CPF corretamente', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
  });
});

describe('CNPJ', () => {
  it('aceita CNPJ válido', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
    expect(isValidCNPJ('11222333000181')).toBe(true);
  });

  it('rejeita CNPJ com todos dígitos iguais', () => {
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
  });

  it('rejeita CNPJ inválido', () => {
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false);
  });

  it('formata CNPJ corretamente', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });
});

describe('CEP', () => {
  it('aceita CEP com hífen', () => {
    expect(isValidCEP('01310-100')).toBe(true);
  });

  it('aceita CEP sem hífen', () => {
    expect(isValidCEP('01310100')).toBe(true);
  });

  it('rejeita CEP inválido', () => {
    expect(isValidCEP('123')).toBe(false);
  });

  it('formata CEP corretamente', () => {
    expect(formatCEP('01310100')).toBe('01310-100');
  });
});

describe('Telefone BR', () => {
  it('aceita celular com DDD', () => {
    expect(isValidPhoneBR('(11) 99999-9999')).toBe(true);
    expect(isValidPhoneBR('11999999999')).toBe(true);
  });

  it('aceita fixo com DDD', () => {
    expect(isValidPhoneBR('1133333333')).toBe(true);
  });

  it('rejeita número muito curto', () => {
    expect(isValidPhoneBR('123')).toBe(false);
  });
});
