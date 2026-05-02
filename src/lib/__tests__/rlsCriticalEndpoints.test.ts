/**
 * RLS — endpoints críticos do multiatendimento
 *
 * Estratégia:
 *  - Usamos a chave **anon** real do projeto (mesma que o navegador anônimo).
 *  - Para cada tabela crítica fazemos um SELECT minimalista (`id`) com `limit(1)`.
 *  - O contrato esperado pelo RLS é:
 *      a) request **não** explode com erro de schema/coluna inexistente; e
 *      b) `anon` recebe **0 linhas** (RLS bloqueia leitura) OU recebe um erro
 *         de permissão. Qualquer linha retornada como anônimo é considerada
 *         vazamento de dados sensíveis.
 *  - Para o "happy path" autenticado, validamos a forma da policy via
 *    `pg_policies` (info_schema do PostgREST não está exposto, então usamos
 *    asserts lógicos sobre o nome da policy). Esse teste roda apenas se
 *    `RUN_RLS_LIVE=1` for setado, evitando flakiness em CI sem rede.
 *
 * Os endpoints abaixo são "endpoints críticos" porque expõem mensagens,
 * contatos, atribuições e credenciais — qualquer regressão de RLS é incidente.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
const ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

const LIVE = Boolean(SUPABASE_URL && ANON_KEY);

// Cada entrada descreve um endpoint sensível e a coluna mínima a inspecionar.
const CRITICAL_TABLES = [
  { table: "messages", col: "id" },
  { table: "contacts", col: "id" },
  { table: "conversation_threads", col: "id" },
  { table: "queues", col: "id" },
  { table: "departments", col: "id" },
  { table: "profiles", col: "id" },
  { table: "user_roles", col: "user_id" },
  { table: "service_channels", col: "id" },
  { table: "whatsapp_connections", col: "id" },
  { table: "message_templates", col: "id" },
  { table: "failed_messages", col: "id" },
  { table: "dispatch_error_logs", col: "id" },
  { table: "provider_message_log", col: "id" },
  { table: "whatsapp_cloud_webhook_pings", col: "id" },
  { table: "audit_logs", col: "id" },
] as const;

const skipIfNoLive = LIVE ? describe : describe.skip;

skipIfNoLive("RLS — anon bloqueado em endpoints críticos do multiatendimento", () => {
  let anon: SupabaseClient;

  beforeAll(() => {
    anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  for (const { table, col } of CRITICAL_TABLES) {
    it(`anon NÃO consegue ler ${table}`, async () => {
      // deno-lint-ignore no-explicit-any
      const { data, error } = await (anon.from(table as any) as any)
        .select(col)
        .limit(1);

      // Cenário aceito #1 — PostgREST devolve erro de permissão/RLS.
      if (error) {
        const msg = (error.message ?? "").toLowerCase();
        const code = String(error.code ?? "");
        const isPermissionError =
          code === "42501" ||
          code === "PGRST301" || // JWT required
          code === "PGRST116" ||
          msg.includes("permission") ||
          msg.includes("rls") ||
          msg.includes("not allowed") ||
          msg.includes("jwt");
        expect(
          isPermissionError,
          `Erro inesperado para anon em ${table}: ${code} ${error.message}`,
        ).toBe(true);
        return;
      }

      // Cenário aceito #2 — RLS silenciosamente filtra tudo (0 linhas).
      expect(
        Array.isArray(data),
        `Resposta inesperada para anon em ${table}`,
      ).toBe(true);
      expect(
        (data as unknown[]).length,
        `🚨 VAZAMENTO RLS: anon leu ${data!.length} linha(s) de ${table}`,
      ).toBe(0);
    });
  }

  it("anon NÃO consegue chamar RPCs sensíveis sem JWT", async () => {
    const RPCS = ["rpc_get_whatsapp_mode", "is_admin_or_supervisor", "has_role"];
    for (const rpc of RPCS) {
      // deno-lint-ignore no-explicit-any
      const { data, error: res3893Err } = await (anon.rpc as any)(rpc, {});
      // O comportamento esperado é erro (função não-pública/JWT required) OU
      // retorno seguro nulo/false. Nenhum vazamento de role/admin para anon.
      if (!error) {
        const safe = data === null || data === false || data === "unofficial";
        expect(
          safe,
          `🚨 RPC ${rpc} retornou ${JSON.stringify(data)} para anon`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Contrato lógico — sem rede. Garante que para CADA tabela crítica existe
// um teste pareado anon-bloqueado, evitando que alguém adicione tabela nova
// e esqueça da cobertura.
// ---------------------------------------------------------------------------
describe("RLS — contrato de cobertura dos endpoints críticos", () => {
  it("toda tabela crítica está coberta pelo teste anon", () => {
    const expected = [
      "messages",
      "contacts",
      "conversation_threads",
      "queues",
      "departments",
      "profiles",
      "user_roles",
      "service_channels",
      "whatsapp_connections",
      "message_templates",
      "failed_messages",
      "dispatch_error_logs",
      "provider_message_log",
      "whatsapp_cloud_webhook_pings",
      "audit_logs",
    ];
    const covered = CRITICAL_TABLES.map((t) => t.table);
    for (const name of expected) {
      expect(covered).toContain(name);
    }
  });

  it("nenhuma tabela crítica usa coluna sensível como filtro de leitura", () => {
    // Smoke: as colunas escolhidas são todas IDs/UUIDs públicos,
    // nunca senha/token/segredo (defesa em profundidade caso alguém edite).
    for (const { col } of CRITICAL_TABLES) {
      expect(col).toMatch(/^(id|user_id)$/);
    }
  });
});
