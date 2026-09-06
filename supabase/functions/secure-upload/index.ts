import { handleCors, getCorsHeaders, jsonResponse, Logger, securityErrorResponse, requireEnv, checkRateLimit } from "../_shared/validation.ts";
import { requireUser } from "../_shared/auth.ts";
import { parseOrReject } from "../_shared/contract-kit.ts";
import { CONTRACT_SCHEMAS } from "../_shared/contract-schemas.ts";
import { createZappAdminClient } from "../_shared/db-client.ts";

/**
 * Secure Upload Middleware
 * Intercepts file uploads, validates via VirusTotal (when configured) and persists.
 *
 * Standardized error response (so the frontend can switch on `code`):
 *   { error: true, contract: 'secure-upload', code, message, verdict, scanId, details? }
 *
 * `details` é OBJETO de metadados do veredito (nunca array — o frontend
 * src/lib/scanResponse.ts faz narrowing por `code` e lê details como
 * Record<string, unknown>).
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — OOM guard (F5b)

// Magic bytes for formats accepted in whatsapp-media / audio-messages buckets.
// RIFF containers (WEBP, WAV) need both the RIFF header and the 4-byte subtype at offset 8.
const MAGIC_SIGNATURES: Array<{
  mime: string;
  magic: number[];
  offset?: number;
  riffSubtype?: number[];
}> = [
  { mime: 'image/jpeg',      magic: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',       magic: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',       magic: [0x47, 0x49, 0x46] },
  { mime: 'image/webp',      magic: [0x52, 0x49, 0x46, 0x46], riffSubtype: [0x57, 0x45, 0x42, 0x50] },
  { mime: 'audio/ogg',       magic: [0x4F, 0x67, 0x67, 0x53] },
  { mime: 'audio/mpeg',      magic: [0x49, 0x44, 0x33] },
  { mime: 'audio/mpeg',      magic: [0xFF, 0xFB] },
  { mime: 'audio/mpeg',      magic: [0xFF, 0xF3] },
  { mime: 'audio/mpeg',      magic: [0xFF, 0xF2] },
  { mime: 'audio/wav',       magic: [0x52, 0x49, 0x46, 0x46], riffSubtype: [0x57, 0x41, 0x56, 0x45] },
  { mime: 'video/mp4',       magic: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: 'video/webm',      magic: [0x1A, 0x45, 0xDF, 0xA3] },
  { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
];

function detectMimeMagic(buf: ArrayBuffer): string | null {
  const view = new Uint8Array(buf, 0, Math.min(16, buf.byteLength));
  for (const sig of MAGIC_SIGNATURES) {
    const off = sig.offset ?? 0;
    if (off + sig.magic.length > view.length) continue;
    if (!sig.magic.every((b, i) => view[off + i] === b)) continue;
    if (sig.riffSubtype) {
      if (8 + sig.riffSubtype.length > view.length) continue;
      if (!sig.riffSubtype.every((b, i) => view[8 + i] === b)) continue;
    }
    return sig.mime;
  }
  return null;
}

// Normalize MIME aliases that are equivalent for comparison purposes.
function normalizeMime(m: string): string {
  return m === 'audio/x-wav' ? 'audio/wav' : m;
}
const ALLOWED_BUCKETS = new Set(["whatsapp-media", "audio-messages"]);

// Splits on '/', decodes percent-encoding, then drops empty / dot / dotdot segments.
// Guards against ....// bypass that replace(/\.\./) leaves as traversal-ready slashes.
const sanitizeStoragePath = (raw: string): string =>
  raw
    .split('/')
    .flatMap(seg => { try { return [decodeURIComponent(seg)]; } catch { return [seg]; } })
    .filter(seg => seg !== '' && seg !== '.' && seg !== '..')
    .join('/');

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("secure-upload", req);

  if (req.method !== "POST") {
    return securityErrorResponse(
      { code: "METHOD_NOT_ALLOWED", message: "Método não permitido." },
      405,
      req,
      'secure-upload',
    );
  }

  try {
    const authed = await requireUser(req);
    if (authed instanceof Response) {
      return securityErrorResponse(
        { code: "UNAUTHORIZED", message: "Sessão inválida ou expirada." },
        401,
        req,
        'secure-upload',
      );
    }

    const rl = checkRateLimit(`secure-upload:${authed.user.id}`, 10, 60_000);
    if (!rl.allowed) {
      return securityErrorResponse(
        { code: "RATE_LIMIT_EXCEEDED", message: "Limite de uploads atingido. Tente novamente em instantes." },
        429,
        req,
        'secure-upload',
      );
    }

    const formData = await req.formData();
    const raw = Object.fromEntries(formData.entries()); // preserva File (multipart)
    // Contrato secure-upload@v1 (estrito): file (File) obrigatório, bucket/path opcionais.
    const parsed = parseOrReject('secure-upload', CONTRACT_SCHEMAS['secure-upload'], req, raw, { extraHeaders: getCorsHeaders(req) });
    if (parsed.ok === false) return parsed.response;
    const body = parsed.data as Record<string, any>;
    const file = body.file as File;

    // Restrict bucket to known-safe values; ignore any attacker-supplied name
    const requestedBucket = (body.bucket as string) || "whatsapp-media";
    const bucket = ALLOWED_BUCKETS.has(requestedBucket) ? requestedBucket : "whatsapp-media";
    const rawPath = body.path ?? null;
    const customPath = rawPath ? sanitizeStoragePath(rawPath) || null : null;

    if (file && file.size > MAX_FILE_SIZE) {
      return securityErrorResponse(
        { code: "FILE_TOO_LARGE", message: "Arquivo excede o limite de 50 MB." },
        413,
        req,
        'secure-upload',
      );
    }

    if (!file) {
      return securityErrorResponse(
        { code: "INVALID_INPUT", message: "Nenhum arquivo enviado.", details: { field: "file" } },
        400,
        req,
        'secure-upload',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return securityErrorResponse(
        { code: "FILE_TOO_LARGE", message: "Arquivo excede o tamanho máximo permitido de 50 MB." },
        413,
        req,
        'secure-upload',
      );
    }

    log.info("Processando upload seguro", {
      fileName: file.name,
      size: file.size,
      type: file.type,
      bucket,
    });

    // 1. Magic bytes: detect real MIME type to catch MIME spoofing before VirusTotal.
    // Read buffer once and reuse for SHA-256 hash below.
    const buf = await file.arrayBuffer();
    const detectedMime = detectMimeMagic(buf);
    if (detectedMime !== null && normalizeMime(detectedMime) !== normalizeMime(file.type)) {
      log.warn("Magic bytes mismatch — possível MIME spoofing bloqueado", {
        declared: file.type,
        detected: detectedMime,
        fileName: file.name,
      });
      return securityErrorResponse(
        {
          code: "INVALID_FILE_TYPE",
          message: "Tipo do arquivo não corresponde ao conteúdo real.",
          verdict: "blocked",
          scanId: null,
          details: { declared: file.type, detected: detectedMime },
        },
        422,
        req,
        'secure-upload',
      );
    }

    // 2. Hash + VirusTotal lookup (preventive, by hash to avoid full re-upload)
    const vtApiKey = Deno.env.get("VIRUSTOTAL_API_KEY");
    let scanId: string | null = null;

    if (vtApiKey && file.size > 0) {
      try {
        const hashBuf = await crypto.subtle.digest("SHA-256", buf);
        const sha256 = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const lookup = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
          headers: { "x-apikey": vtApiKey },
          signal: AbortSignal.timeout(10_000),
        });

        if (lookup.ok) {
          const data = await lookup.json();
          scanId = data?.data?.id ?? sha256;
          const stats = data?.data?.attributes?.last_analysis_stats ?? {};
          const malicious = stats.malicious ?? 0;
          const suspicious = stats.suspicious ?? 0;

          if (malicious > 0) {
            log.warn("Bloqueando upload — hash conhecido como malicioso", { sha256 });
            return securityErrorResponse(
              {
                code: "MALWARE_DETECTED",
                message: "Arquivo bloqueado: conteúdo malicioso identificado.",
                verdict: "malicious",
                scanId,
                details: { malicious, suspicious, fileName: file.name },
              },
              422,
              req,
              'secure-upload',
            );
          }

          if (suspicious > 0) {
            log.warn("Bloqueando upload — hash suspeito", { sha256 });
            return securityErrorResponse(
              {
                code: "SUSPICIOUS_FILE",
                message: "Arquivo bloqueado por suspeita de ameaça.",
                verdict: "suspicious",
                scanId,
                details: { malicious, suspicious, fileName: file.name },
              },
              403,
              req,
              'secure-upload',
            );
          }
        } else if (lookup.status !== 404) {
          log.warn("Falha no lookup VirusTotal", { status: lookup.status });
        }
      } catch (err) {
        log.error("Erro na varredura preventiva", { error: String(err) });
        // Não bloqueia o fluxo: a varredura é best-effort aqui.
      }
    }

    // 2. Persist to storage
    const supabase = createZappAdminClient();

    const fileExt = file.name.split(".").pop();
    const fileName =
      customPath ||
      `secure/${crypto.randomUUID()}.${fileExt}`;

    log.info("Persistindo no storage", { path: fileName });

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      log.error("Erro no storage", { error: uploadError.message });
      return securityErrorResponse(
        {
          code: "STORAGE_ERROR",
          message: "Falha ao salvar o arquivo no armazenamento.",
          verdict: "clean",
          scanId,
          details: { reason: uploadError.message },
        },
        500,
        req,
        'secure-upload',
      );
    }

    const { data: signedUrl } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 3600);

    log.done(200, { path: fileName });

    return jsonResponse(
      {
        success: true,
        verdict: "clean",
        scanId,
        message: "Upload concluído com sucesso.",
        path: data.path,
        url: signedUrl?.signedUrl || fileName,
        fullPath: `${bucket}/${data.path}`,
      },
      200,
      req,
    );
  } catch (error: unknown) {
    log.error("Crash no upload", {
      error: error instanceof Error ? error.message : String(error),
    });
    return securityErrorResponse(
      {
        code: "INTERNAL_ERROR",
        message: "Erro interno no processamento do upload.",
        verdict: "unknown",
      },
      500,
      req,
      'secure-upload',
    );
  }
});
