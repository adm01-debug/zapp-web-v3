import { describe, it, expect } from 'vitest';
import { parseHookEvent, parseEdgeLabel } from '../realtimeEventParser';

/**
 * Garante que mensagens de erro do parser sejam claras e acionaveis quando
 * encontram entradas invalidas — para acelerar o debug em PRs que mexem no
 * diagrama TRILHA_MENSAGENS_NAVEGAVEL ou em hooks com .on('postgres_changes').
 */

describe('parseHookEvent — mensagens de erro claras', () => {
  it('string vazia menciona "vazia" e lista valores aceitos', () => {
    const { events, errors } = parseHookEvent('');
    expect(events.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/vazia/);
    expect(errors[0]).toContain("'*'");
    expect(errors[0]).toContain('INSERT');
    expect(errors[0]).toContain('UPDATE');
    expect(errors[0]).toContain('DELETE');
  });

  it('"* *" reporta whitespace interno e nao retorna eventos', () => {
    const { events, errors } = parseHookEvent('* *');
    expect(events.size).toBe(0);
    expect(errors.some((e) => /whitespace interno/.test(e))).toBe(true);
    expect(errors[0]).toContain('"* *"');
  });

  it('"INSERT UPDATE" (espaco) e rejeitado com mensagem sobre token unico', () => {
    const { events, errors } = parseHookEvent('INSERT UPDATE');
    expect(events.size).toBe(0);
    expect(errors[0]).toMatch(/whitespace interno|unico token/);
  });

  it('"INSERT|UPDATE" reporta separador nao suportado e sugere registrar .on por evento', () => {
    const { events, errors } = parseHookEvent('INSERT|UPDATE');
    expect(events.size).toBe(0);
    expect(errors[0]).toContain('separador');
    expect(errors[0]).toMatch(/\.on\(/);
    expect(errors[0]).toContain("'*'");
  });

  it('"INSERT,UPDATE" tambem cai como separador invalido', () => {
    const { errors } = parseHookEvent('INSERT,UPDATE');
    expect(errors[0]).toContain('separador');
  });

  it('"insert" (minusculo) e rejeitado por caracteres inesperados', () => {
    const { events, errors } = parseHookEvent('insert');
    expect(events.size).toBe(0);
    expect(errors[0]).toContain('caracteres inesperados');
    expect(errors[0]).toContain('A-Z');
  });

  it('"INSERT?" reporta caractere fora do alfabeto permitido', () => {
    const { events, errors } = parseHookEvent('INSERT?');
    expect(events.size).toBe(0);
    expect(errors[0]).toContain('caracteres inesperados');
  });

  it('"TRUNCATE" e rejeitado como token nao reconhecido', () => {
    const { events, errors } = parseHookEvent('TRUNCATE');
    expect(events.size).toBe(0);
    expect(errors[0]).toContain('nao e reconhecido');
    expect(errors[0]).toContain('TRUNCATE');
  });

  it('" INSERT" (whitespace nas bordas) acumula erro mas ainda processa o token', () => {
    const { events, errors } = parseHookEvent(' INSERT');
    expect(errors[0]).toContain('whitespace nas bordas');
    // Apos trimar, o token e valido, entao o evento deve ser registrado.
    expect(events).toEqual(new Set(['INSERT']));
  });

  it('valores validos nao geram erros', () => {
    for (const v of ['*', 'INSERT', 'UPDATE', 'DELETE']) {
      const { errors } = parseHookEvent(v);
      expect(errors, `"${v}" deveria ser valido`).toEqual([]);
    }
  });
});

describe('parseEdgeLabel — mensagens de erro claras em rotulos do diagrama', () => {
  it('rotulo vazio reporta erro pedindo um evento', () => {
    const { events, errors } = parseEdgeLabel('   ');
    expect(events.size).toBe(0);
    expect(errors[0]).toMatch(/vazio/);
  });

  it('rotulo sem evento reconhecivel reporta erro citando o rotulo', () => {
    const { events, errors } = parseEdgeLabel('mensagens novas');
    expect(events.size).toBe(0);
    expect(errors[0]).toContain('"mensagens novas"');
    expect(errors[0]).toMatch(/INSERT.*UPDATE.*DELETE|nenhum evento/);
  });

  it('rotulo com SELECT reporta evento nao suportado', () => {
    const { errors } = parseEdgeLabel('SELECT messages');
    expect(errors.some((e) => /SELECT/.test(e))).toBe(true);
  });

  it('rotulo com TRUNCATE reporta evento nao suportado', () => {
    const { errors } = parseEdgeLabel('TRUNCATE all');
    expect(errors.some((e) => /TRUNCATE/.test(e))).toBe(true);
  });

  it('rotulo com pipe "|" reporta separador proibido', () => {
    const { errors } = parseEdgeLabel('INSERT|UPDATE');
    expect(errors.some((e) => /separador proibido/.test(e))).toBe(true);
  });

  it('rotulos validos nao geram erros', () => {
    for (const v of ['*', 'INSERT', 'UPDATE status', 'INSERT/UPDATE/DELETE', '* messages']) {
      const { errors, events } = parseEdgeLabel(v);
      expect(errors, `"${v}" deveria ser valido`).toEqual([]);
      expect(events.size, `"${v}" deveria ter eventos`).toBeGreaterThan(0);
    }
  });
});
