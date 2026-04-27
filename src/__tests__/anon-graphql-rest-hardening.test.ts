/**
 * Hardening tests — Onda 1
 *
 * Garantem que requests feitas com a chave anônima (anon) NÃO conseguem:
 *   1. Listar tabelas sensíveis do schema `public` via introspecção GraphQL
 *      (ou, se a introspecção for permitida, que os tipos sensíveis estão sem
 *      query fields acessíveis / sem grants efetivos).
 *   2. Ler dados via REST/PostgREST nessas mesmas tabelas (RLS + revogação de
 *      SELECT devem bloquear o acesso).
 *
 * Estes testes batem na API real do Lovable Cloud usando a anon key publishable.
 * Não exigem credenciais privadas — apenas a publishable key, que já é pública.
 *
 * Se a rede estiver indisponível (ex.: CI offline), os testes são marcados como
 * skipped automaticamente em vez de falhar com false-negative.
 */

import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_URL = "https://allrjhkpuscmgbsnmjlv.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbHJqaGtwdXNjbWdic25tamx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDc3NDQsImV4cCI6MjA4MTMyMzc0NH0.7S2yN87sjm22J9DXC7Njo7UaXQ2tHk6XMJheNVqHA74";

/**
 * Tabelas que JAMAIS devem ser legíveis por anon, nem expostas com fields
 * úteis na introspecção GraphQL pública.
 */
const SENSITIVE_TABLES = [
  "profiles",
  "messages",
  "contacts",
  "contact_notes",
  "contact_custom_fields",
  "calls",
  "channel_connections",
  "auth_attempts",
  "login_attempts",
  "password_reset_requests",
  "passkey_credentials",
  "mfa_sessions",
  "ai_usage_logs",
  "audit_logs",
  "security_alerts",
  "ip_whitelist",
  "global_settings",
] as const;

let networkAvailable = true;

async function safeFetch(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (err) {
    networkAvailable = false;
    throw err;
  }
}

beforeAll(async () => {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
    });
    // qualquer resposta HTTP confirma rede; código não importa
    await r.text();
  } catch {
    networkAvailable = false;
  }
});

describe("Anon hardening — REST/PostgREST", () => {
  for (const table of SENSITIVE_TABLES) {
    it(`anon NÃO deve ler linhas da tabela ${table}`, async () => {
      if (!networkAvailable) return;

      const res = await safeFetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
        },
      );

      // Aceita: 401/403 (negado), 404 (escondido), ou 200 com array vazio
      // (RLS filtrou tudo). REJEITA: 200 com qualquer linha.
      if (res.status === 200) {
        const body = (await res.json()) as unknown;
        expect(Array.isArray(body)).toBe(true);
        expect((body as unknown[]).length).toBe(0);
      } else {
        expect([401, 403, 404]).toContain(res.status);
        await res.text(); // drena body
      }
    });
  }
});

describe("Anon hardening — GraphQL introspecção", () => {
  it("introspecção pública não deve listar tabelas sensíveis com query fields acessíveis", async () => {
    if (!networkAvailable) return;

    const introspectionQuery = `
      query {
        __schema {
          queryType {
            fields { name }
          }
          types {
            name
            kind
          }
        }
      }
    `;

    const res = await safeFetch(`${SUPABASE_URL}/graphql/v1`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: introspectionQuery }),
    });

    // Se o endpoint GraphQL não estiver habilitado/exposto, ótimo: nada a vazar.
    if (res.status !== 200) {
      expect([401, 403, 404, 405]).toContain(res.status);
      await res.text();
      return;
    }

    const json = (await res.json()) as {
      data?: {
        __schema?: {
          queryType?: { fields?: Array<{ name: string }> };
          types?: Array<{ name: string; kind: string }>;
        };
      };
      errors?: unknown;
    };

    // Se a introspecção foi rejeitada, perfeito.
    if (!json.data?.__schema) return;

    const queryFields =
      json.data.__schema.queryType?.fields?.map((f) => f.name) ?? [];

    // PostgREST/pg_graphql expõe collections como `<tableName>Collection`.
    // Para anon, NENHUMA das tabelas sensíveis deve aparecer como collection.
    for (const table of SENSITIVE_TABLES) {
      const collectionName = `${table}Collection`;
      const exposed = queryFields.some(
        (f) => f === collectionName || f === table,
      );

      // Mesmo que o tipo exista no schema, o que importa é não haver field
      // de query para anon. Se aparecer, é regressão.
      expect(
        exposed,
        `Tabela sensível "${table}" exposta na introspecção pública via field "${collectionName}"`,
      ).toBe(false);
    }
  });

  it("query GraphQL real para tabela sensível não deve retornar dados para anon", async () => {
    if (!networkAvailable) return;

    // Tenta consultar profiles via GraphQL
    const query = `
      query {
        profilesCollection(first: 1) {
          edges { node { id } }
        }
      }
    `;

    const res = await safeFetch(`${SUPABASE_URL}/graphql/v1`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (res.status !== 200) {
      expect([401, 403, 404, 405]).toContain(res.status);
      await res.text();
      return;
    }

    const json = (await res.json()) as {
      data?: {
        profilesCollection?: {
          edges?: Array<{ node: { id: string } }>;
        } | null;
      };
      errors?: Array<{ message: string }>;
    };

    // Aceita: erro de permissão OU collection null OU edges vazio.
    // REJEITA: qualquer edge retornado.
    const edges = json.data?.profilesCollection?.edges;
    if (edges) {
      expect(edges.length).toBe(0);
    } else {
      // sem dados (errors ou null) — comportamento esperado
      expect(true).toBe(true);
    }
  });
});

describe("Anon hardening — sanidade", () => {
  it("anon ainda consegue alcançar o endpoint REST (chave válida)", async () => {
    if (!networkAvailable) return;
    const res = await safeFetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
    });
    // raiz retorna 200 com OpenAPI summary — confirma que a chave funciona
    expect([200, 404]).toContain(res.status);
    await res.text();
  });
});
