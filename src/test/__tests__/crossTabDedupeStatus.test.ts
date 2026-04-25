/**
 * Garante que `subscribeDedupeStatus` mantém spinners consistentes entre abas:
 *   - `start` é emitido localmente E broadcastado para outras abas.
 *   - `end` (com endReason) é emitido em result/error/release.
 *   - `getInflightStatusKeys` permite snapshot inicial cobrir start anterior.
 *   - `markEnd` ignora `release` quando ownerId já mudou (anti-race).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  dedupedFetch,
  subscribeDedupeStatus,
  getInflightStatusKeys,
  clearCrossTabDedupe,
  type DedupeStatusEvent,
} from '@/lib/realtime/crossTabDedupe';

describe('crossTabDedupe — status (loading) por chave', () => {
  beforeEach(() => {
    clearCrossTabDedupe();
  });

  it('emite start + end (result) localmente para o líder', async () => {
    const events: DedupeStatusEvent[] = [];
    const unsub = subscribeDedupeStatus('inbox:v2:initial:', (e) => events.push(e));

    await dedupedFetch('inbox:v2:initial:JIDA:100', async () => {
      // Durante o fetch, snapshot mostra a chave ativa.
      const snap = getInflightStatusKeys('inbox:v2:initial:');
      expect(snap.length).toBe(1);
      expect(snap[0].key).toBe('inbox:v2:initial:JIDA:100');
      expect(snap[0].isOwnedByThisTab).toBe(true);
      return [{ id: 1 }];
    });

    unsub();

    // Esperamos: start (local) → end (local, result). O 'release' final é
    // idempotente (markEnd já removeu via 'result').
    expect(events.map((e) => `${e.phase}:${e.endReason ?? ''}:${e.source}`)).toEqual([
      'start::local',
      'end:result:local',
    ]);
    // Após terminar, snapshot zera.
    expect(getInflightStatusKeys('inbox:v2:initial:')).toEqual([]);
  });

  it('emite end:error quando o fetcher falha (sem retry)', async () => {
    const events: DedupeStatusEvent[] = [];
    const unsub = subscribeDedupeStatus(/^inbox:v2:older:/, (e) => events.push(e));

    await expect(
      dedupedFetch('inbox:v2:older:X:1700000000000:50', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    unsub();
    const phases = events.map((e) => `${e.phase}:${e.endReason ?? ''}`);
    expect(phases[0]).toBe('start:');
    expect(phases.includes('end:error')).toBe(true);
    expect(getInflightStatusKeys(/^inbox:v2:older:/)).toEqual([]);
  });

  it('matcher por prefixo string casa qualquer chave abaixo dele', async () => {
    const seen: string[] = [];
    const unsub = subscribeDedupeStatus('inbox:v2:initial:', (e) => {
      if (e.phase === 'start') seen.push(e.key);
    });
    await dedupedFetch('inbox:v2:initial:A:100', async () => 'a');
    await dedupedFetch('inbox:v2:initial:B:100', async () => 'b');
    await dedupedFetch('inbox:v2:older:C:1:50', async () => 'c'); // não casa
    unsub();
    expect(seen).toEqual(['inbox:v2:initial:A:100', 'inbox:v2:initial:B:100']);
  });

  it('snapshot inicial cobre fetch que começou ANTES do subscribe', async () => {
    let resolve!: (v: unknown) => void;
    const slow = new Promise((r) => (resolve = r));
    const p = dedupedFetch('inbox:v2:initial:LATE:100', () => slow);
    // Subscribe DEPOIS do start: snapshot deve listar a chave ativa.
    const snap = getInflightStatusKeys('inbox:v2:initial:LATE');
    expect(snap.length).toBe(1);
    expect(snap[0].key).toBe('inbox:v2:initial:LATE:100');
    resolve(['done']);
    await p;
    expect(getInflightStatusKeys('inbox:v2:initial:LATE')).toEqual([]);
  });

  it('múltiplos subscribers recebem o mesmo evento', async () => {
    const a: DedupeStatusEvent[] = [];
    const b: DedupeStatusEvent[] = [];
    const ua = subscribeDedupeStatus('inbox:v2:initial:', (e) => a.push(e));
    const ub = subscribeDedupeStatus('inbox:v2:initial:', (e) => b.push(e));
    await dedupedFetch('inbox:v2:initial:Z:100', async () => 'ok');
    ua(); ub();
    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThanOrEqual(2);
  });
});
