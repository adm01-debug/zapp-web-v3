/**
 * Utilitários de moeda — precisão segura para valores monetários.
 *
 * Regra: NUNCA usar parseFloat() em valores monetários que vão para o banco.
 * parseFloat("1.23") pode gerar 1.2299999... em IEEE 754.
 * parseBRL usa inteiros de centavos internamente para evitar arredondamentos.
 */

/**
 * Formata um número para moeda brasileira (R$).
 * @param v       Valor numérico; null/undefined/NaN → retorna fallback.
 * @param fallback Texto quando valor é nulo (padrão: '—').
 */
export function formatBRL(v: number | null | undefined, fallback = '—'): string {
  if (v == null || Number.isNaN(v)) return fallback;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parseia uma string de valor monetário para número (centavos→reais).
 * Suporta formatos: "1.234,56" / "1234.56" / "R$ 1.234,56" / "1234"
 * Retorna 0 para string vazia ou inválida.
 */
export function parseBRL(s: string | null | undefined): number {
  if (!s) return 0;
  // Remove símbolo de moeda e espaços
  const cleaned = s.replace(/R\$\s*/g, '').trim();
  if (!cleaned) return 0;

  // Formato brasileiro: ponto como separador de milhar, vírgula como decimal
  // Ex: "1.234,56" → 1234.56
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const cents = Math.round(parseFloat(normalized) * 100);
    return cents / 100;
  }

  // Formato com ponto decimal simples (sem separador de milhar)
  // Ex: "1234.56"
  if (/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    const cents = Math.round(parseFloat(cleaned) * 100);
    return cents / 100;
  }

  // Fallback: remover tudo que não é dígito, vírgula ou ponto
  const fallback = cleaned.replace(/[^\d,.]/g, '').replace(',', '.');
  const cents = Math.round(parseFloat(fallback) * 100);
  return Number.isFinite(cents) ? cents / 100 : 0;
}
