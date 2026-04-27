import { handleCors, errorResponse, jsonResponse, requireEnv, Logger } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * File Security Scanner Edge Function
 * This function acts as a middleware for file uploads.
 * It uses VirusTotal API for scanning.
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

    // Ensure it's a POST request with multipart data
    if (req.method !== "POST") {
      return errorResponse("Only POST requests are allowed", 405, req);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucketId = formData.get("bucket") as string || "uploads";

    if (!file) {
      return errorResponse("No file provided", 400, req);
    }

    log.info("Starting scan for file", { name: file.name, size: file.size, bucket: bucketId });

    // 1. Prepare for VirusTotal Upload (using the /files endpoint for small files < 32MB)
    // For larger files, we'd need the /files/upload_url endpoint.
    const vtFormData = new FormData();
    vtFormData.append("file", file);

    const vtResponse = await fetch("https://www.virustotal.com/api/v3/files", {
      method: "POST",
      headers: {
        "x-apikey": VIRUSTOTAL_API_KEY,
      },
      body: vtFormData,
    });

    if (!vtResponse.ok) {
      const vtError = await vtResponse.text();
      log.error("VirusTotal API error", { status: vtResponse.status, detail: vtError });
      return errorResponse("Failed to communicate with security service", 502, req);
    }

    const vtData = await vtResponse.json();
    const analysisId = vtData.data.id;

    log.info("Analysis submitted", { analysisId });

    // 2. Poll for results (Simplified for this example - in production, use webhooks if possible)
    let analysisResult;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { "x-apikey": VIRUSTOTAL_API_KEY },
      });
      
      analysisResult = await pollResponse.json();
      const status = analysisResult.data.attributes.status;

      if (status === "completed") break;
      
      log.debug("Analysis still in progress...", { attempt: attempts + 1 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (!analysisResult || analysisResult.data.attributes.status !== "completed") {
      log.warn("Analysis timed out, blocking for safety");
      return errorResponse("Security scan timed out. Please try again.", 408, req);
    }

    const stats = analysisResult.data.attributes.stats;
    const isMalicious = stats.malicious > 0 || stats.suspicious > 0;

    // 3. Log the scan result
    await supabase.from("file_scan_logs").insert({
      file_name: file.name,
      bucket_id: bucketId,
      status: isMalicious ? "malicious" : "clean",
      provider: "VirusTotal",
      provider_response: analysisResult,
    });

    if (isMalicious) {
      log.error("Malicious file detected!", { name: file.name, stats });
      
      // Move to quarantine for investigation instead of just deleting if needed
      const { error: qError } = await supabase.storage
        .from("quarantine")
        .upload(`${Date.now()}_${file.name}`, file);

      if (qError) log.error("Failed to move to quarantine", { error: qError });

      return errorResponse("Security violation: Malicious content detected", 422, req);
    }

    // 4. If clean, proceed with upload to the target bucket
    log.info("File is clean, proceeding with upload", { name: file.name });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(`${Date.now()}_${file.name}`, file, {
        upsert: true
      });

    if (uploadError) {
      log.error("Storage upload failed", { error: uploadError });
      return errorResponse("Failed to save file to storage", 500, req);
    }

    log.done(200, { path: uploadData.path });
    return jsonResponse({
      success: true,
      message: "File scanned and uploaded successfully",
      path: uploadData.path
    }, 200, req);

  } catch (error: unknown) {
    log.error("Unhandled exception in scanner", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return errorResponse("Internal security processing error", 500, req);
  }
});
