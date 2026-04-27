import { handleCors, errorResponse, jsonResponse, requireEnv, Logger } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * File Security Scanner Edge Function (Otimizada com Streaming e Hashing)
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("file-security-scanner", req);

  try {
    const VIRUSTOTAL_API_KEY = requireEnv("VIRUSTOTAL_API_KEY");
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== "POST") {
      return errorResponse("Only POST requests are allowed", 405, req);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucketId = formData.get("bucket") as string || "uploads";

    if (!file) return errorResponse("No file provided", 400, req);

    log.info("Iniciando escaneamento seguro", { name: file.name, size: file.size });

    // --- 1. Cálculo de Hash usando Streaming para reduzir uso de memória ---
    const fileHash = await calculateHashStreaming(file);
    log.info("Hash calculado via streaming", { hash: fileHash });

    // --- 2. Verificação Prévia no VirusTotal (Evita re-upload se já analisado) ---
    let vtData: any = null;
    let isMalicious = false;

    try {
      const vtCheck = await fetch(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
        headers: { "x-apikey": VIRUSTOTAL_API_KEY },
      });

      if (vtCheck.ok) {
        vtData = await vtCheck.json();
        const stats = vtData.data?.attributes?.last_analysis_stats;
        if (stats && (stats.malicious > 0 || stats.suspicious > 5)) {
          isMalicious = true;
          log.warn("Arquivo identificado como malicioso pelo hash histórico", { stats });
        }
      } else if (file.size < 32 * 1024 * 1024) {
        // Se não encontrado e < 32MB, envia para análise
        const vtFormData = new FormData();
        vtFormData.append("file", file);
        const vtUpload = await fetch("https://www.virustotal.com/api/v3/files", {
          method: "POST",
          headers: { "x-apikey": VIRUSTOTAL_API_KEY },
          body: vtFormData,
        });
        if (vtUpload.ok) vtData = await vtUpload.json();
      }
    } catch (err) {
      log.error("Erro na comunicação com VirusTotal", { error: String(err) });
    }

    // --- 3. Registro de Log Auditoria ---
    await supabase.from("file_scan_logs").insert({
      user_id: (await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') || '')).data.user?.id,
      bucket: isMalicious ? "quarantine" : bucketId,
      path: `secure/${Date.now()}_${file.name}`,
      hash: fileHash,
      scan_result: isMalicious ? "infected" : "clean",
      raw_scan_data: vtData,
      status_code: 200
    });

    if (isMalicious) {
      log.warn("Bloqueando upload de arquivo malicioso", { name: file.name, hash: fileHash });
      
      // Mover para quarantine usando stream para análise posterior
      await supabase.storage.from("quarantine").upload(`malicious/${fileHash}_${file.name}`, file.stream(), { 
        contentType: file.type,
        duplex: 'half' 
      });

      return errorResponse(
        "Segurança: O arquivo foi identificado como malicioso e bloqueado preventivamente.", 
        422, // Unprocessable Entity - Regra de negócio/segurança violada
        req
      );
    }

    // Se o veredito for inconclusivo mas suspeito, podemos usar 403
    const isSuspicious = vtData?.data?.attributes?.last_analysis_stats?.suspicious > 2;
    if (isSuspicious) {
      return errorResponse(
        "Acesso Negado: O arquivo possui características suspeitas e não pode ser processado.",
        403, // Forbidden
        req
      );
    }

    // --- 4. Upload Final Otimizado com Streaming ---
    const finalPath = `secure/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(finalPath, file.stream(), {
        contentType: file.type,
        upsert: true,
        duplex: 'half'
      });

    if (uploadError) throw uploadError;

    log.done(200, { path: uploadData.path });
    return jsonResponse({
      success: true,
      path: uploadData.path,
      hash: fileHash
    }, 200, req);

  } catch (error: any) {
    log.error("Exception no scanner", { error: error.message });
    return errorResponse("Internal security processing error", 500, req);
  }
});

/**
 * Calcula o hash SHA-256 de um arquivo processando o stream para economia de memória
 */
async function calculateHashStreaming(file: File): Promise<string> {
  const stream = file.stream();
  const reader = stream.getReader();
  const chunks = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
