/**
 * Integration tests — v2.3.7 fallback behavior for `find-chats`,
 * `find-contacts` and `fetch-profile`.
 *
 * CONTEXT
 * ───────
 * A memória do projeto (`mem://integrations/evolution-api`) descreve um
 * fallback automático para essas três ações quando o endpoint v2.3.7 retorna
 * 404 / endpoint indisponível:
 *
 *   - find-chats     → 410 deprecated + alternative='rpc_list_conversations'
 *   - find-contacts  → 410 deprecated + alternative='rpc_list_contacts'
 *   - fetch-profile  → tenta /profile/fetchProfile; se 404 → fallback para
 *                      /instance/fetchInstances mapeando ownerJid→wuid etc.,
 *                      com `_source: "fetchInstances-fallback"`.
 *
 * Estes testes documentam o COMPORTAMENTO ATUAL do código (não o pretendido
 * pela memória): hoje as três ações apenas repassam ao endpoint upstream via
 * `proxyToEvolution`, sem nenhuma lógica de fallback. Servem como contrato
 * regressivo até o fallback ser implementado — quando isso acontecer, estes
 * testes vão falhar e devem ser reescritos para refletir o novo contrato.
 *
 * ESTRATÉGIA
 * ──────────
 * Não bootamos a edge function inteira (o handler `serve()` exige Supabase
 * client e secrets). Em vez disso, exercitamos o mesmo `proxyToEvolution` que
 * o `index.ts` chama para essas três ações, com os MESMOS argumentos
 * (path/method/body), e validamos o response envelope.
 *
 * Os paths testados são exatamente os definidos em `index.ts`:
 *   - find-chats    → POST  /chat/findChats/{instance}
 *   - find-contacts → POST  /chat/findContacts/{instance}
 *   - fetch-profile → GET   /profile/fetchProfile/{instance}
 */

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { proxyToEvolution } from "../../_shared/evolution-api-proxy.ts";
import {
  CORS_DEFAULT,
  KEY,
  leakSafeOpts,
  URL_BASE,
  withFetchStub,
} from "./_helpers.ts";

const INSTANCE = "wpp2";

// ──────────────────────────────────────────────────────────────────────────
// Helpers locais
// ──────────────────────────────────────────────────────────────────────────

interface CapturedCall {
  url: string;
  method: string;
  body: string | null;
}

/**
 * Stub de fetch que captura cada request feita pelo proxy e responde com
 * `responses` em ordem. Se houver mais requests que respostas, repete a
 * última. Útil para detectar tentativas de fallback (2ª chamada).
 */
function recordingStub(responses: Response[]): {
  fetch: typeof globalThis.fetch;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];
  let i = 0;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const reqInit = (init ?? {}) as RequestInit;
    const method = (reqInit.method ?? "GET").toUpperCase();
    const rawBody = reqInit.body;
    const body = typeof rawBody === "string" ? rawBody : null;
    calls.push({ url, method, body });
    const res = responses[Math.min(i, responses.length - 1)];
    i++;
    return res.clone();
  };
  return { fetch, calls };
}

const json404 = (msg = "Cannot POST /chat/findChats/wpp2") =>
  new Response(JSON.stringify({ message: msg, error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });

const json410 = () =>
  new Response(JSON.stringify({ message: "Gone" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  });

const jsonOk = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

// ──────────────────────────────────────────────────────────────────────────
// find-chats
// ──────────────────────────────────────────────────────────────────────────

Deno.test({
  ...leakSafeOpts,
  name: "find-chats: upstream 404 → SEM fallback hoje (envelope 404 direto)",
  fn: async () => {
    const { fetch, calls } = recordingStub([json404("findChats not found")]);
    await withFetchStub(fetch, async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        `/chat/findChats/${INSTANCE}`,
        "POST",
        { where: {} },
      );

      assertEquals(res.status, 200, "proxy sempre devolve HTTP 200");
      const body = await res.json();

      // Comportamento atual: erro 404 propagado, sem `deprecated` nem `alternative`.
      assertEquals(body.error, true);
      assertEquals(body.status, 404);
      assert(
        body.message?.includes("Instância não encontrada") ||
          body.message?.includes("não encontrad"),
        `mensagem 404 esperada, veio: ${body.message}`,
      );
      assertEquals(
        body.alternative,
        undefined,
        "se este campo aparecer, o fallback foi implementado — atualize o teste",
      );
      assertEquals(body.deprecated, undefined);

      // Sentinela: apenas 1 chamada upstream (sem retry para RPC).
      // O proxy pode tentar 2 vezes apenas para STATUSES retentáveis (não 404).
      assertEquals(
        calls.length,
        1,
        "404 não é retentável — proxy não deve repetir nem fazer fallback",
      );
      assertEquals(calls[0].method, "POST");
      assert(calls[0].url.endsWith(`/chat/findChats/${INSTANCE}`));
    });
  },
});

Deno.test({
  ...leakSafeOpts,
  name: "find-chats: upstream 410 (Gone) também propaga sem fallback",
  fn: async () => {
    const { fetch, calls } = recordingStub([json410()]);
    await withFetchStub(fetch, async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        `/chat/findChats/${INSTANCE}`,
        "POST",
        { where: {} },
      );
      const body = await res.json();
      assertEquals(body.error, true);
      assertEquals(body.status, 410);
      assertEquals(calls.length, 1);
      assertEquals(
        body.alternative,
        undefined,
        "fallback ainda não implementado — se aparecer, atualize o teste",
      );
    });
  },
});

// ──────────────────────────────────────────────────────────────────────────
// find-contacts
// ──────────────────────────────────────────────────────────────────────────

Deno.test({
  ...leakSafeOpts,
  name: "find-contacts: upstream 404 → SEM fallback hoje",
  fn: async () => {
    const { fetch, calls } = recordingStub([
      json404("findContacts not found"),
    ]);
    await withFetchStub(fetch, async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        `/chat/findContacts/${INSTANCE}`,
        "POST",
        { where: {} },
      );
      const body = await res.json();
      assertEquals(body.error, true);
      assertEquals(body.status, 404);
      assertEquals(calls.length, 1);
      assert(calls[0].url.endsWith(`/chat/findContacts/${INSTANCE}`));
      assertEquals(body.alternative, undefined);
      assertEquals(body.deprecated, undefined);
    });
  },
});

Deno.test({
  ...leakSafeOpts,
  name: "find-contacts: upstream 200 → passthrough da resposta",
  fn: async () => {
    const payload = [{ id: "5511@s.whatsapp.net", pushName: "Cliente" }];
    const { fetch, calls } = recordingStub([jsonOk(payload)]);
    await withFetchStub(fetch, async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        `/chat/findContacts/${INSTANCE}`,
        "POST",
        { where: {} },
      );
      assertEquals(res.status, 200);
      const body = await res.json();
      // Sucesso → corpo é o próprio payload (sem envelope de erro).
      // O proxy injeta `version` no envelope versionado — comparamos o resto.
      const { version: _v, ...rest } = body;
      assertEquals(rest, payload);
      assertEquals(calls.length, 1);
    });
  },
});

// ──────────────────────────────────────────────────────────────────────────
// fetch-profile
// ──────────────────────────────────────────────────────────────────────────

Deno.test({
  ...leakSafeOpts,
  name:
    "fetch-profile: upstream 404 → SEM fallback automático para /instance/fetchInstances",
  fn: async () => {
    // Se o fallback existisse, esperaríamos 2 chamadas:
    //   1. GET /profile/fetchProfile/wpp2  → 404
    //   2. GET /instance/fetchInstances?instanceName=wpp2 → 200 (mapeado)
    // Hoje só temos a 1ª.
    const { fetch, calls } = recordingStub([
      json404("fetchProfile not found"),
      jsonOk([{
        instance: {
          instanceName: INSTANCE,
          ownerJid: "5511999999999@s.whatsapp.net",
          profilePicUrl: "https://x/pic.jpg",
          profileName: "Promo Brindes",
        },
      }]),
    ]);

    await withFetchStub(fetch, async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        `/profile/fetchProfile/${INSTANCE}`,
        "GET",
      );
      assertEquals(res.status, 200);
      const body = await res.json();

      // Erro 404 propagado.
      assertEquals(body.error, true);
      assertEquals(body.status, 404);

      // Marcador do fallback não está presente.
      assertEquals(
        body._source,
        undefined,
        "se '_source' aparecer, o fallback foi implementado — atualize o teste",
      );
      assertEquals(body.wuid, undefined);
      assertEquals(body.picture, undefined);

      // Apenas 1 chamada upstream — fallback NÃO foi acionado.
      assertEquals(
        calls.length,
        1,
        "fetch-profile ainda não tenta /instance/fetchInstances no 404",
      );
      assertEquals(calls[0].method, "GET");
      assert(calls[0].url.endsWith(`/profile/fetchProfile/${INSTANCE}`));
    });
  },
});

Deno.test({
  ...leakSafeOpts,
  name: "fetch-profile: upstream 200 → passthrough sem _source marker",
  fn: async () => {
    const payload = {
      wuid: "5511999999999@s.whatsapp.net",
      name: "Promo Brindes",
      picture: "https://x/pic.jpg",
      status: { status: "Disponível" },
    };
    const { fetch, calls } = recordingStub([jsonOk(payload)]);
    await withFetchStub(fetch, async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        `/profile/fetchProfile/${INSTANCE}`,
        "GET",
      );
      const body = await res.json();
      // O proxy injeta `version` no envelope versionado — comparamos o resto.
      const { version: _v, ...rest } = body;
      assertEquals(rest, payload);
      assertEquals(
        body._source,
        undefined,
        "passthrough puro: nenhum marcador de fallback é injetado",
      );
      assertEquals(calls.length, 1);
    });
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Cross-cutting: CORS preservado nos envelopes de erro
// ──────────────────────────────────────────────────────────────────────────

Deno.test({
  ...leakSafeOpts,
  name:
    "CORS headers preservados em find-chats / find-contacts / fetch-profile com 404",
  fn: async () => {
    const customCors = {
      "Access-Control-Allow-Origin": "https://app.example.com",
      "X-Test-Header": "v237",
    };
    const targets: Array<{ path: string; method: string }> = [
      { path: `/chat/findChats/${INSTANCE}`, method: "POST" },
      { path: `/chat/findContacts/${INSTANCE}`, method: "POST" },
      { path: `/profile/fetchProfile/${INSTANCE}`, method: "GET" },
    ];

    for (const { path, method } of targets) {
      const { fetch } = recordingStub([json404()]);
      await withFetchStub(fetch, async () => {
        const res = await proxyToEvolution(
          URL_BASE,
          KEY,
          customCors,
          path,
          method,
          method === "POST" ? {} : undefined,
        );
        assertEquals(
          res.headers.get("Access-Control-Allow-Origin"),
          "https://app.example.com",
          `CORS quebrado em ${path}`,
        );
        assertEquals(
          res.headers.get("X-Test-Header"),
          "v237",
          `header custom quebrado em ${path}`,
        );
        assertEquals(res.headers.get("Content-Type"), "application/json");
        const body = await res.json();
        assertExists(body.message, `envelope de erro sem 'message' em ${path}`);
      });
    }
  },
});
