/**
 * Validadores brasileiros: CPF, CNPJ, CEP, telefone.
 * Funções puras — sem dependência de frameworks.
 * Para integração com zod: usar os schemas exportados ao final.
 */

// ── CPF ─────────────────────────────────────────────────────────────────────

/** Remove formatação e valida dígitos verificadores do CPF. */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === Number(digits[10]);
}

/** Formata CPF: "12345678909" → "123.456.789-09". */
export function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '').slice(0, 11);
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

// ── CNPJ ────────────────────────────────────────────────────────────────────

/** Valida dígitos verificadores do CNPJ. */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (d: string, w: number[]) => {
    const sum = w.reduce((acc, weight, i) => acc + Number(d[i]) * weight, 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  return (
    calc(digits, w1) === Number(digits[12]) &&
    calc(digits, w2) === Number(digits[13])
  );
}

/** Formata CNPJ: "12345678000195" → "12.345.678/0001-95". */
export function formatCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// ── CEP ─────────────────────────────────────────────────────────────────────

/** Valida formato do CEP (apenas estrutura; não checa existência no banco). */
export function isValidCEP(cep: string): boolean {
  return /^\d{5}-?\d{3}$/.test(cep.trim());
}

/** Formata CEP: "01310100" → "01310-100". */
export function formatCEP(cep: string): string {
  const d = cep.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

// ── Telefone BR ──────────────────────────────────────────────────────────────

/** Valida telefone BR (8–9 dígitos + DDD). */
export function isValidPhoneBR(phone: string): boolean {
  const d = phone.replace(/\D/g, '');
  // Com DDI: +55 (11) 99999-9999 = 13 dígitos; sem DDI: 10 ou 11
  return /^(?:55)?(\d{2})(\d{8,9})$/.test(d);
}

// ── Zod schemas (importar zod dinamicamente para evitar bundle desnecessário) ─

/** Retorna um refinement zod para CPF. Uso: z.string().superRefine(zodCPF). */
export const zodCPF = (val: string, ctx: { addIssue: (arg: { code: string; message: string }) => void }) => {
  if (!isValidCPF(val)) {
    ctx.addIssue({ code: 'custom', message: 'CPF inválido' });
  }
};

/** Retorna um refinement zod para CNPJ. Uso: z.string().superRefine(zodCNPJ). */
export const zodCNPJ = (val: string, ctx: { addIssue: (arg: { code: string; message: string }) => void }) => {
  if (!isValidCNPJ(val)) {
    ctx.addIssue({ code: 'custom', message: 'CNPJ inválido' });
  }
};

/** Refinement zod para CEP. */
export const zodCEP = (val: string, ctx: { addIssue: (arg: { code: string; message: string }) => void }) => {
  if (!isValidCEP(val)) {
    ctx.addIssue({ code: 'custom', message: 'CEP inválido' });
  }
};
