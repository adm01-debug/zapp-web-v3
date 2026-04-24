#!/usr/bin/env bun
/**
 * regen-trilha-mensagens.ts
 *
 * Regenerates `src/test/fixtures/TRILHA_MENSAGENS_NAVEGAVEL.mmd` from:
 *   1. An ALLOWLIST (this file) — the stable map of node-id -> label/path/subgraph.
 *      This stays under human control: it defines *which* hooks belong to the
 *      diagram and how they should be drawn.
 *   2. A code SCAN — regex over `src/` looking for actual `.on('postgres_changes', {
 *      event, schema, table, filter? }, handler)` calls so we can detect drift
 *      (consumer added/removed in code but not reflected in the diagram).
 *
 * Goal: every time the messaging trail evolves, run this script and the .mmd
 * either re-emits identically (no drift) or fails loudly listing what changed.
 *
 * Usage:
 *   bun run scripts/regen-trilha-mensagens.ts            # write file
 *   bun run scripts/regen-trilha-mensagens.ts --check    # exit 1 if drift / out-of-date
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SRC_DIR = join(ROOT, "src");
const FIXTURE = join(ROOT, "src/test/fixtures/TRILHA_MENSAGENS_NAVEGAVEL.mmd");
const TARGET_TABLE = "messages";

// ---------------------------------------------------------------------------
// 1) ALLOWLIST — human-curated. Everything the diagram is supposed to show.
//    `consumesMessagesTable` marks the 8 known fan-out consumers we cross-check
//    against the regex scan.
// ---------------------------------------------------------------------------

interface NodeDef {
  id: string;
  label: string;          // Mermaid label (already escaped, may contain <br/>)
  path?: string;          // file path used for `click <id> "<path>"`
  subgraph: string;       // subgraph key (see SUBGRAPHS below)
  consumesMessagesTable?: boolean;
}

const SUBGRAPHS: Record<string, string> = {
  UI: '1. Composicao e Envio (UI)',
  IDEMP: '1b. Deduplicacao — buildSendIdempotencyKey',
  TRANSPORT: '2. Transporte e Retry',
  BUS: '3. Status Bus (in-memory)',
  PERSIST: '4. Persistencia e Hooks de leitura',
  RT: '5. Realtime e Batching',
  RENDER: '6. Render',
  BACKENDS: '7. Backends',
};

const NODES: NodeDef[] = [
  // UI
  { id: 'CIL', label: 'useChatInputLogic', path: 'src/components/inbox/chat/useChatInputLogic.ts', subgraph: 'UI' },
  { id: 'MS',  label: 'messageSender',     path: 'src/hooks/realtime/messageSender.ts',           subgraph: 'UI' },
  { id: 'IDK', label: 'buildSendIdempotencyKey<br/>(roteador legacy/fingerprint)', path: 'src/lib/sendIdempotency.ts', subgraph: 'UI' },

  // IDEMP
  { id: 'FP',     label: 'SendFingerprint<br/>{contactId, type, content, mediaUrl}', path: 'src/lib/sendIdempotency.ts', subgraph: 'IDEMP' },
  { id: 'NORM',   label: 'normalize()<br/>trim + JSON estavel',                       path: 'src/lib/sendIdempotency.ts', subgraph: 'IDEMP' },
  { id: 'BUCKET', label: 'timeBucket = floor(now / 5min)',                            path: 'src/lib/sendIdempotency.ts', subgraph: 'IDEMP' },
  { id: 'HASH',   label: 'SHA-256 (SubtleCrypto)<br/>fallback FNV-1a',                path: 'src/lib/sendIdempotency.ts', subgraph: 'IDEMP' },
  { id: 'KEYFP',  label: 'chave: mfp:s256:&lt;hex&gt;<br/>(content-aware, estavel por 5min)', path: 'src/lib/sendIdempotency.ts', subgraph: 'IDEMP' },
  { id: 'KEYROW', label: 'chave legacy: msg:&lt;rowId&gt;<br/>(fallback DLQ / call sites antigos)', path: 'src/lib/sendIdempotency.ts', subgraph: 'IDEMP' },

  // TRANSPORT
  { id: 'ESR',    label: 'evolutionSendRetry — fan-out critico', path: 'src/lib/evolutionSendRetry.ts',                    subgraph: 'TRANSPORT' },
  { id: 'RETRY',  label: 'lib/retry (withRetry)',                path: 'src/lib/retry.ts',                                  subgraph: 'TRANSPORT' },
  { id: 'RCFG',   label: 'loadRetryConfig',                      path: 'src/lib/retryConfig.ts',                            subgraph: 'TRANSPORT' },
  { id: 'DLQENQ', label: 'enqueueClientFailedMessage',           path: 'src/lib/failedMessagesEnqueue.ts',                  subgraph: 'TRANSPORT' },
  { id: 'DLQRP',  label: 'reprocess-failed-messages<br/>(edge cron)', path: 'supabase/functions/reprocess-failed-messages/index.ts', subgraph: 'TRANSPORT' },

  // BUS
  { id: 'EMIT',   label: 'emitSendStatus',         path: 'src/hooks/realtime/sendStatusBus.ts', subgraph: 'BUS' },
  { id: 'SUBALL', label: 'subscribeAllSendStatus', path: 'src/hooks/realtime/sendStatusBus.ts', subgraph: 'BUS' },
  { id: 'GETST',  label: 'getSendStatus',          path: 'src/hooks/realtime/sendStatusBus.ts', subgraph: 'BUS' },

  // PERSIST  (UM/UMS also consume realtime — flagged below)
  { id: 'UM',   label: 'useMessages',            path: 'src/hooks/useMessages.ts',                  subgraph: 'PERSIST', consumesMessagesTable: true },
  { id: 'UMS',  label: 'useMessageStatus',       path: 'src/hooks/useMessageStatus.ts',             subgraph: 'PERSIST', consumesMessagesTable: true },
  { id: 'UMSS', label: 'useMessageSendStatus',   path: 'src/hooks/realtime/useMessageSendStatus.ts', subgraph: 'PERSIST' },

  // RT
  { id: 'BATCH', label: 'useMessageUpdateBatcher',          path: 'src/hooks/realtime/useMessageUpdateBatcher.ts',         subgraph: 'RT' },
  { id: 'URM',   label: 'useRealtimeMessages',              path: 'src/hooks/useRealtimeMessages.ts',                      subgraph: 'RT', consumesMessagesTable: true },
  { id: 'RUTL',  label: 'realtimeUtils',                    path: 'src/hooks/realtime/realtimeUtils.ts',                   subgraph: 'RT' },
  { id: 'URN',   label: 'useRealtimeNotifications',         path: 'src/hooks/realtime/useRealtimeNotifications.ts',        subgraph: 'RT' },
  { id: 'UTN',   label: 'useTranscriptionNotifications',    path: 'src/hooks/useTranscriptionNotifications.ts',            subgraph: 'RT', consumesMessagesTable: true },
  { id: 'URD',   label: 'useRealtimeDashboard',             path: 'src/hooks/useRealtimeDashboard.ts',                     subgraph: 'RT', consumesMessagesTable: true },
  { id: 'UEM',   label: 'useEvolutionMonitoring',           path: 'src/components/monitoring/hooks/useEvolutionMonitoring.ts', subgraph: 'RT', consumesMessagesTable: true },
  { id: 'AMP',   label: 'AudioMessagePlayer',               path: 'src/components/inbox/AudioMessagePlayer.tsx',           subgraph: 'RT', consumesMessagesTable: true },

  // RENDER
  { id: 'MSI', label: 'MessageStatusInline',     path: 'src/components/inbox/chat/MessageStatusInline.tsx', subgraph: 'RENDER' },
  { id: 'VML', label: 'VirtualizedMessageList',  path: 'src/components/inbox/VirtualizedMessageList.tsx',   subgraph: 'RENDER' },
  { id: 'MB',  label: 'MessageBubble',           path: 'src/components/inbox/chat/MessageBubble.tsx',       subgraph: 'RENDER' },
];

// Edges are listed verbatim — they encode business meaning, not derivable from
// the regex scan, so they live in the allowlist too. This is the place to edit
// when wiring changes.
const EDGES: string[] = [
  '%% Composicao -> envio',
  'CIL --> MS',
  'MS --> IDK',
  'MS --> ESR',
  'MS ==> DB',
  '',
  '%% Transporte',
  'ESR --> RETRY',
  'ESR --> RCFG',
  'ESR --> EDGE',
  'ESR -..-> DLQENQ',
  'DLQENQ ==> DLQ',
  '',
  '%% Reprocessamento DLQ — fecha o ciclo: mensagens falhadas voltam ao fluxo',
  'DLQ -.->|cron / manual trigger| DLQRP',
  'DLQRP ==>|atualiza status / retry_attempt| DB',
  'DLQRP -.->|registra outcome| DLQ',
  '',
  '%% Idempotencia — como a chave e construida e onde dedupa',
  'IDK --> FP',
  'FP --> NORM',
  'NORM --> BUCKET',
  'BUCKET --> HASH',
  'HASH --> KEYFP',
  'IDK -.->|fallback se nao ha fingerprint| KEYROW',
  'KEYFP -->|Idempotency-Key header| ESR',
  'KEYROW -->|Idempotency-Key header| ESR',
  'ESR -->|mesma chave em todas<br/>tentativas do withRetry<br/>=> servidor dedupa retry| EDGE',
  'DLQRP -->|reusa chave estavel<br/>=> servidor dedupa reenvio| EDGE',
  '',
  '%% Status bus',
  'MS -.-> EMIT',
  'ESR -.-> EMIT',
  'EMIT -.-> SUBALL',
  'GETST -.-> UMSS',
  'SUBALL -.-> UMSS',
  'SUBALL -.-> UMS',
  '',
  '%% Persistencia / leitura',
  'UM ==> DB',
  'UMS ==> DB',
  '',
  '%% =====================================================================',
  "%% FAN-OUT REALTIME — quem escuta postgres_changes na tabela 'messages'",
  '%% =====================================================================',
  'DB -.->|INSERT/UPDATE| URM',
  'DB -.->|INSERT/UPDATE/DELETE| UM',
  'DB -.->|UPDATE status| UMS',
  'DB -.->|UPDATE transcription| UTN',
  'DB -.->|INSERT/UPDATE KPIs| URD',
  'DB -.->|INSERT health| UEM',
  'DB -.->|UPDATE media_url| AMP',
  '',
  '%% Pipeline interno do realtime principal',
  'URM --> BATCH',
  'URM --> URN',
  'URM --> RUTL',
  'BATCH -.-> UM',
  'BATCH --> RUTL',
  '',
  '%% Render',
  'UMSS --> MSI',
  'UMS --> MSI',
  'UM --> VML',
  'VML --> MB',
  'MSI --> MB',
  'UTN -.-> MB',
];

const BACKEND_NODES = `
    DB[("Lovable Cloud<br/>messages")]
    EDGE[("Edge<br/>evolution-api/sendText")]
    DLQ[("DLQ<br/>failed_messages")]`;

// ---------------------------------------------------------------------------
// 2) SCANNER — regex over src/ to detect actual postgres_changes('messages')
//    consumers. We don't try to parse paths perfectly: we walk every .ts/.tsx,
//    look for `.on('postgres_changes', { ... table: 'messages' ... })` and
//    map the file back to a hook/component name.
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      out.push(p);
    }
  }
  return out;
}

interface ScanHit { file: string; consumerName: string; events: string[]; }

function scanCode(): ScanHit[] {
  const files = walk(SRC_DIR);
  const hits: ScanHit[] = [];
  // Match `.on('postgres_changes'` followed by a binding object containing
  // `table: 'messages'` within ~400 chars.
  const re = /\.on\(\s*['"]postgres_changes['"]\s*,\s*(\{[\s\S]{0,400}?\})/g;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const events = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const binding = m[1];
      if (!/table:\s*['"]messages['"]/.test(binding)) continue;
      const evMatch = binding.match(/event:\s*['"]([A-Z*]+)['"]/);
      if (evMatch) events.add(evMatch[1]);
    }
    if (events.size > 0) {
      hits.push({
        file: relative(ROOT, file),
        consumerName: file.replace(/\.tsx?$/, '').split('/').pop() ?? file,
        events: [...events].sort(),
      });
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// 3) DRIFT DETECTION — cross-reference allowlist vs scan
// ---------------------------------------------------------------------------

interface DriftReport {
  missingInAllowlist: ScanHit[];     // code subscribes but allowlist doesn't list
  missingInCode: NodeDef[];          // allowlist marks consumer but no subscription found
}

function detectDrift(hits: ScanHit[]): DriftReport {
  const allowed = NODES.filter(n => n.consumesMessagesTable);
  const allowedPaths = new Set(allowed.map(n => n.path));
  const hitPaths = new Set(hits.map(h => h.file));

  return {
    missingInAllowlist: hits.filter(h => !allowedPaths.has(h.file)),
    missingInCode: allowed.filter(n => n.path && !hitPaths.has(n.path)),
  };
}

// ---------------------------------------------------------------------------
// 4) RENDERER
// ---------------------------------------------------------------------------

function renderMmd(): string {
  const lines: string[] = [];
  lines.push("%%{init: {'flowchart': {'curve': 'basis'}}}%%");
  lines.push('flowchart LR');
  lines.push('');

  // Subgraphs in the canonical order
  const order: (keyof typeof SUBGRAPHS)[] = ['UI','IDEMP','TRANSPORT','BUS','PERSIST','RT','RENDER'];
  for (const key of order) {
    lines.push(`  subgraph ${key}["${SUBGRAPHS[key]}"]`);
    for (const n of NODES.filter(x => x.subgraph === key)) {
      lines.push(`    ${n.id}["${n.label}"]`);
    }
    lines.push('  end');
    lines.push('');
  }

  // Backend nodes
  lines.push(`  subgraph BACKENDS["${SUBGRAPHS.BACKENDS}"]`);
  lines.push(BACKEND_NODES.trim().split('\n').map(l => `    ${l.trim()}`).join('\n'));
  lines.push('  end');
  lines.push('');

  // Edges
  for (const e of EDGES) {
    lines.push(e === '' ? '' : `  ${e}`);
  }
  lines.push('');

  // Clicks (auto-generated from allowlist)
  lines.push('  %% Links navegaveis (auto-gerado pelo regen-trilha-mensagens.ts)');
  for (const n of NODES) {
    if (n.path) lines.push(`  click ${n.id} "${n.path}"`);
  }
  lines.push('');

  // Legend
  lines.push('%% Legenda das arestas:');
  lines.push('%%   -->   chamada sincrona / import');
  lines.push('%%   ==>   escrita persistente em DB');
  lines.push('%%   -.->  evento realtime / pub-sub in-memory');
  lines.push('%%   -..-> enqueue assincrona (DLQ)');
  lines.push("%% Fan-out realtime (postgres_changes 'messages'): consumidores conhecidos:");
  for (const n of NODES.filter(x => x.consumesMessagesTable)) {
    lines.push(`%%   - ${n.id} (${n.label.split('<')[0]}) -> ${n.path}`);
  }
  lines.push('%% Gerado automaticamente por scripts/regen-trilha-mensagens.ts');
  lines.push(`%% Em: ${new Date().toISOString()}`);
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has('--check');

  const hits = scanCode();
  const drift = detectDrift(hits);

  let driftFound = false;
  if (drift.missingInAllowlist.length > 0) {
    driftFound = true;
    console.error('\n[drift] Subscriptions em código mas FORA da allowlist:');
    for (const h of drift.missingInAllowlist) {
      console.error(`  - ${h.file} [${h.events.join(', ')}]`);
    }
  }
  if (drift.missingInCode.length > 0) {
    driftFound = true;
    console.error('\n[drift] Nós marcados como consumers MAS sem subscription detectada no código:');
    for (const n of drift.missingInCode) {
      console.error(`  - ${n.id} (${n.path})`);
    }
  }

  // Validate paths exist
  const fs = require('node:fs');
  const missingFiles = NODES.filter(n => n.path && !fs.existsSync(join(ROOT, n.path)));
  if (missingFiles.length > 0) {
    driftFound = true;
    console.error('\n[drift] Paths da allowlist que NÃO existem no repo:');
    for (const n of missingFiles) console.error(`  - ${n.id} -> ${n.path}`);
  }

  const next = renderMmd();

  if (checkOnly) {
    const current = readFileSync(FIXTURE, 'utf8');
    if (current.trim() !== next.trim()) {
      console.error('\n[check] .mmd está fora de sincronia. Rode sem --check para regenerar.');
      process.exit(1);
    }
    if (driftFound) {
      console.error('\n[check] Drift entre allowlist e código. Atualize NODES e re-rode.');
      process.exit(1);
    }
    console.log('OK — diagrama em sincronia com a allowlist e o código.');
    return;
  }

  writeFileSync(FIXTURE, next, 'utf8');
  console.log(`Wrote ${relative(ROOT, FIXTURE)} (${next.split('\n').length} linhas).`);
  console.log(`Hits encontrados: ${hits.length}; consumers na allowlist: ${NODES.filter(n => n.consumesMessagesTable).length}.`);
  if (driftFound) {
    console.error('\nAtenção: foi gerado, mas há divergências acima. Resolva antes de commitar.');
    process.exit(2);
  }
}

main();
