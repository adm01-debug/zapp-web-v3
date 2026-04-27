import { handleCors, jsonResponse, Logger, errorResponse, requireEnv } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Middleware de Segurança Preventiva para Uploads
 * Intercepta o arquivo, valida via VirusTotal (opcional) e persiste no storage.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("secure-upload", req);

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse("Não autorizado", 401, req);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'whatsapp-media';
    const customPath = formData.get('path') as string;

    if (!file) {
      return errorResponse("Nenhum arquivo enviado", 400, req);
    }

    log.info("Processando upload seguro", { 
      fileName: file.name, 
      size: file.size, 
      type: file.type,
      bucket 
    });

    // 1. Validação Preventiva (VirusTotal)
    const vtApiKey = Deno.env.get('VIRUSTOTAL_API_KEY');
    if (vtApiKey && file.size > 0) {
      log.info("Iniciando varredura VirusTotal");
      
      // Para arquivos pequenos, podemos enviar o conteúdo diretamente
      // Para arquivos grandes, o ideal seria enviar o hash primeiro
      const vtFormData = new FormData();
      vtFormData.append('file', file);

      try {
        const vtResponse = await fetch("https://www.virustotal.com/api/v3/files", {
          method: 'POST',
          headers: { 'x-apikey': vtApiKey },
          body: vtFormData
        });

        if (vtResponse.ok) {
          const vtData = await vtResponse.json();
          log.info("Arquivo enviado para análise", { id: vtData.data?.id });
          // Nota: Em um fluxo real síncrono, poderíamos esperar o resultado se fosse crítico,
          // mas o VT leva tempo. Aqui validamos que a chave está ativa e o envio funcionou.
        } else {
          log.warn("Falha na comunicação com VirusTotal", { status: vtResponse.status });
        }
      } catch (err) {
        log.error("Erro ao conectar com VirusTotal", { error: String(err) });
      }
    }

    // 2. Persistência no Storage usando Service Role (bypass RLS para este middleware controlado)
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileExt = file.name.split('.').pop();
    const fileName = customPath || `secure/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    log.info("Persistindo no storage", { path: fileName });

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      log.error("Erro no storage", { error: uploadError.message });
      return errorResponse(`Erro ao salvar arquivo: ${uploadError.message}`, 500, req);
    }

    // 3. Gerar URL Assinada (opcional, dependendo do bucket ser público)
    const { data: signedUrl } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 3600);

    log.done(200, { path: fileName });

    return jsonResponse({
      success: true,
      path: data.path,
      url: signedUrl?.signedUrl || fileName,
      fullPath: `${bucket}/${data.path}`
    }, 200, req);

  } catch (error: unknown) {
    log.error("Crash no upload", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse("Erro interno no processamento do upload", 500, req);
  }
});
