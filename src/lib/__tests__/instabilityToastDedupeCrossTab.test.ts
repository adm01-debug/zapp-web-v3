/**
 * Testes cross-tab da deduplicação do toast "Conexão instável".
 *
 * Cobertura:
 *   1. Persistência em `localStorage`: aba B carregada DEPOIS de A já ter
 *      disparado herda o cooldown e suprime o toast.
 *   2. Persistência respeita TTL: após `cooldownMs` expirar, B pode disparar.
 *   3. `BroadcastChannel`: aba B já carregada ouve o disparo de A em tempo
 *      real e suprime o próximo `shouldShowInstabilityToast`.
 *   4. `releaseInstabilityToastDedupe(contactId)` propaga para outras abas.
 *   5. `releaseInstabilityToastDedupe()` (global) propaga para outras abas.
 *   6. `__resetInstabilityToastDedupeForTest` limpa também o `localStorage`.
 *
 * Padrão: usamos `vi.resetModules()` para carregar uma "segunda aba" — duas
 * cópias do módulo compartilham o mesmo `localStorage` (jsdom) e o mesmo
 * `BroadcastChannel` global, exatamente como duas abas reais do navegador.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Mod = typeof import('@/lib/instabilityToastDedupe');

async function loadModule(): Promise<Mod> {
  return (await import('@/lib/instabilityToastDedupe')) as Mod;
}

async function loadFreshTab(): Promise<Mod> {
  vi.resetModules();
  return loadModule();
}

/**
 * Aguarda o BroadcastChannel processar o microtask + macrotask. O canal do
 * jsdom entrega de forma assíncrona, então damos o tempo necessário antes
 * de inspecionar o estado da outra "aba".
 */
function flushBroadcast(): Promise<void> {
  return new Promise((r) => setTimeout(r, 10));
}

beforeEach(async () => {
  // Limpa qualquer estado herdado de outros testes.
  if (typeof localStorage !== 'undefined') localStorage.clear();
  vi.resetModules();
  const mod = await loadModule();
  mod.__resetInstabilityToastDedupeForTest();
});

afterEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  vi.useRealTimers();
});

describe('instabilityToastDedupe — persistência cross-tab via localStorage', () => {
  it('aba B carregada DEPOIS de A disparar herda o cooldown e suprime', async () => {
    const tabA = await loadModule();
    const err = { status: 500 };
    const t0 = 1_000_000;

    expect(tabA.shouldShowInstabilityToast('c1', err, { nowMs: t0 })).toBe(true);

    // Simula aba B: novo módulo, mesmo localStorage.
    const tabB = await loadFreshTab();

    // Mesmo erro 5s depois — dentro do cooldown padrão (60s).
    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 5_000 })).toBe(false);
  });

  it('persistência respeita o cooldown: aba B dispara após expirar', async () => {
    const tabA = await loadModule();
    const err = { status: 500 };
    const t0 = 2_000_000;
    const cooldownMs = 30_000;

    expect(tabA.shouldShowInstabilityToast('c1', err, { nowMs: t0, cooldownMs })).toBe(true);

    const tabB = await loadFreshTab();
    // Dentro do cooldown → suprimido
    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 10_000, cooldownMs })).toBe(false);
    // Após cooldown → libera
    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 31_000, cooldownMs })).toBe(true);
  });

  it('contatos diferentes em abas diferentes não interferem', async () => {
    const tabA = await loadModule();
    const err = { status: 500 };
    const t0 = 3_000_000;
    expect(tabA.shouldShowInstabilityToast('c1', err, { nowMs: t0 })).toBe(true);

    const tabB = await loadFreshTab();
    // Contato distinto continua livre.
    expect(tabB.shouldShowInstabilityToast('c2', err, { nowMs: t0 + 1_000 })).toBe(true);
  });

  it('tipos de erro distintos no mesmo contato não interferem cross-tab', async () => {
    const tabA = await loadModule();
    const t0 = 4_000_000;
    expect(tabA.shouldShowInstabilityToast('c1', { status: 500 }, { nowMs: t0 })).toBe(true);

    const tabB = await loadFreshTab();
    // SERVER persistido por A; B emite TIMEOUT — categoria distinta.
    expect(tabB.shouldShowInstabilityToast('c1', { status: 504 }, { nowMs: t0 + 1_000 })).toBe(true);
  });

  it('__resetInstabilityToastDedupeForTest limpa também o localStorage', async () => {
    const tab = await loadModule();
    tab.shouldShowInstabilityToast('c1', { status: 500 }, { nowMs: 5_000_000 });

    // Existe entrada persistida.
    const prefixed = Object.keys(localStorage).filter((k) => k.startsWith('itd:fired:'));
    expect(prefixed.length).toBeGreaterThan(0);

    tab.__resetInstabilityToastDedupeForTest();
    const after = Object.keys(localStorage).filter((k) => k.startsWith('itd:fired:'));
    expect(after.length).toBe(0);
  });
});

describe('instabilityToastDedupe — propagação cross-tab via BroadcastChannel', () => {
  it('aba B JÁ CARREGADA recebe broadcast de A e suprime o próximo disparo', async () => {
    // Carrega B PRIMEIRO para que ouça o canal antes de A disparar.
    const tabB = await loadFreshTab();
    const tabA = await loadFreshTab();

    const err = { status: 500 };
    const t0 = 6_000_000;

    expect(tabA.shouldShowInstabilityToast('c1', err, { nowMs: t0 })).toBe(true);
    await flushBroadcast();

    // B nunca chamou shouldShow, mas recebeu o broadcast → cooldown ativo.
    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 100 })).toBe(false);
  });

  it('broadcast NÃO afeta o disparo da própria aba (sem auto-eco)', async () => {
    const tab = await loadModule();
    const err = { status: 500 };
    const t0 = 7_000_000;
    expect(tab.shouldShowInstabilityToast('c1', err, { nowMs: t0 })).toBe(true);
    await flushBroadcast();
    // A própria aba A ainda enxerga o cooldown (via memória local).
    expect(tab.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 1_000 })).toBe(false);
  });

  it('release(contactId) propaga e libera a aba B imediatamente', async () => {
    const tabB = await loadFreshTab();
    const tabA = await loadFreshTab();
    const err = { status: 500 };
    const t0 = 8_000_000;

    tabA.shouldShowInstabilityToast('c1', err, { nowMs: t0 });
    await flushBroadcast();
    // B está bloqueada via broadcast/persistência.
    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 100 })).toBe(false);

    // A libera o contato — broadcast + remove storage.
    tabA.releaseInstabilityToastDedupe('c1');
    await flushBroadcast();

    // B deve poder disparar novamente.
    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 200 })).toBe(true);
  });

  it('release() global propaga para todas as abas', async () => {
    const tabB = await loadFreshTab();
    const tabA = await loadFreshTab();
    const err = { status: 500 };
    const t0 = 9_000_000;

    tabA.shouldShowInstabilityToast('c1', err, { nowMs: t0 });
    tabA.shouldShowInstabilityToast('c2', err, { nowMs: t0 });
    await flushBroadcast();

    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 100 })).toBe(false);
    expect(tabB.shouldShowInstabilityToast('c2', err, { nowMs: t0 + 100 })).toBe(false);

    tabA.releaseInstabilityToastDedupe();
    await flushBroadcast();

    expect(tabB.shouldShowInstabilityToast('c1', err, { nowMs: t0 + 200 })).toBe(true);
    expect(tabB.shouldShowInstabilityToast('c2', err, { nowMs: t0 + 200 })).toBe(true);
  });

  it('avalanche: 5 abas tentam disparar a mesma chave dentro do cooldown → 1 toast', async () => {
    const tabs: Mod[] = [];
    for (let i = 0; i < 5; i++) {
      tabs.push(await loadFreshTab());
    }
    const err = { status: 500 };
    const t0 = 10_000_000;

    let fired = 0;
    // Primeira aba dispara primeiro e os outros tentam um pouco depois,
    // garantindo que o broadcast/persistência tenha propagado.
    if (tabs[0].shouldShowInstabilityToast('c1', err, { nowMs: t0 })) fired++;
    await flushBroadcast();
    for (let i = 1; i < tabs.length; i++) {
      if (tabs[i].shouldShowInstabilityToast('c1', err, { nowMs: t0 + i * 50 })) fired++;
    }

    expect(fired).toBe(1);
  });
});
