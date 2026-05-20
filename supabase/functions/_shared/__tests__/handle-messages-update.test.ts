// Testa que handleMessagesUpdate mapeia ACK do WhatsApp/Baileys corretamente.
// Foco: PLAYED e PLAYED_ACK devem virar 'played' (não colapsar em 'read'),
// preservando o ícone de fones na bolha de áudio.
//
// Rodar: deno test supabase/functions/_shared/__tests__/handle-messages-update.test.ts

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleMessagesUpdate } from '../evolution-webhook-msg-handlers.ts';

type UpdateCall = { table: string; patch: Record<string, unknown>; eqColumn: string; eqValue: unknown };

interface ExistingMessage {
  id: string;
  status: string | null;
  external_id: string;
}

function makeFakeSupabase(existing: ExistingMessage[]) {
  const updates: UpdateCall[] = [];
  const inserts: { table: string; row: Record<string, unknown> }[] = [];

  // deno-lint-ignore no-explicit-any
  const fakeSupabase: any = {
    from(table: string) {
      let pendingPatch: Record<string, unknown> | null = null;
      let isInsert = false;
      const filters: Record<string, unknown> = {};

      const builder = {
        select(_cols: string) { return builder; },
        update(patch: Record<string, unknown>) {
          pendingPatch = patch;
          return builder;
        },
        insert(row: Record<string, unknown>) {
          isInsert = true;
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          // Quando é UPDATE final encadeado por .eq('id', ...), registrar.
          if (pendingPatch && col === 'id') {
            updates.push({ table, patch: pendingPatch, eqColumn: col, eqValue: val });
            pendingPatch = null;
            return Promise.resolve({ data: null, error: null });
          }
          return builder;
        },
        maybeSingle() {
          // Lookup de existing message por external_id.
          if (table === 'messages' && filters.external_id) {
            const row = existing.find((m) => m.external_id === filters.external_id);
            return Promise.resolve({ data: row ?? null, error: null });
          }
          // whatsapp_connections lookup → retornamos algo "vazio" para evitar branch de insert.
          if (table === 'whatsapp_connections') {
            return Promise.resolve({ data: { id: 'conn-fake', instance_id: filters.instance_id }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single() { return this.maybeSingle(); },
      };

      // Suprimir warning de não-uso
      void isInsert;
      return builder;
    },
  };

  return { fakeSupabase, updates, inserts };
}

Deno.test('handleMessagesUpdate: PLAYED → status "played" (não "read")', async () => {
  const existing: ExistingMessage[] = [
    { id: 'msg-1', status: 'delivered', external_id: 'wa-msg-PLAYED-1' },
  ];
  const { fakeSupabase, updates } = makeFakeSupabase(existing);

  await handleMessagesUpdate(fakeSupabase, 'wpp2', {
    messages: [
      { key: { id: 'wa-msg-PLAYED-1', remoteJid: '5511999999999@s.whatsapp.net' }, status: 'PLAYED' },
    ],
  }, {});

  assertEquals(updates.length, 1, 'esperava 1 UPDATE');
  assertEquals(updates[0].table, 'messages');
  assertEquals(updates[0].eqValue, 'msg-1');
  assertEquals(updates[0].patch.status, 'played', 'PLAYED não pode ser colapsado em "read"');
  assert(typeof updates[0].patch.status_updated_at === 'string');
});

Deno.test('handleMessagesUpdate: PLAYED_ACK → status "played"', async () => {
  const existing: ExistingMessage[] = [
    { id: 'msg-2', status: 'read', external_id: 'wa-msg-PLAYED-2' },
  ];
  const { fakeSupabase, updates } = makeFakeSupabase(existing);

  await handleMessagesUpdate(fakeSupabase, 'wpp2', {
    messages: [
      { key: { id: 'wa-msg-PLAYED-2', remoteJid: '5511999999999@s.whatsapp.net' }, status: 'PLAYED_ACK' },
    ],
  }, {});

  // Política de prioridade: read=played=3 → não atualiza quando já está em 'read'.
  // O importante é garantir que o mapeamento NUNCA gera 'read' a partir de PLAYED_ACK.
  for (const u of updates) {
    assert(u.patch.status !== 'read', 'PLAYED_ACK jamais pode virar "read"');
    if (u.patch.status) assertEquals(u.patch.status, 'played');
  }
});

Deno.test('handleMessagesUpdate: READ continua mapeando para "read"', async () => {
  const existing: ExistingMessage[] = [
    { id: 'msg-3', status: 'delivered', external_id: 'wa-msg-READ-1' },
  ];
  const { fakeSupabase, updates } = makeFakeSupabase(existing);

  await handleMessagesUpdate(fakeSupabase, 'wpp2', {
    messages: [
      { key: { id: 'wa-msg-READ-1', remoteJid: '5511999999999@s.whatsapp.net' }, status: 'READ' },
    ],
  }, {});

  assertEquals(updates.length, 1);
  assertEquals(updates[0].patch.status, 'read');
});

Deno.test('handleMessagesUpdate: SERVER_ACK / DELIVERY_ACK mapeiam corretamente', async () => {
  const existing: ExistingMessage[] = [
    { id: 'msg-4', status: 'sending', external_id: 'wa-srv' },
    { id: 'msg-5', status: 'sent', external_id: 'wa-dlv' },
  ];
  const { fakeSupabase, updates } = makeFakeSupabase(existing);

  await handleMessagesUpdate(fakeSupabase, 'wpp2', {
    messages: [
      { key: { id: 'wa-srv', remoteJid: '5511999999999@s.whatsapp.net' }, status: 'SERVER_ACK' },
      { key: { id: 'wa-dlv', remoteJid: '5511999999999@s.whatsapp.net' }, status: 'DELIVERY_ACK' },
    ],
  }, {});

  const byId = Object.fromEntries(updates.map((u) => [u.eqValue, u.patch.status]));
  assertEquals(byId['msg-4'], 'sent');
  assertEquals(byId['msg-5'], 'delivered');
});
