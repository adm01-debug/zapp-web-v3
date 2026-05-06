import { handleCors, errorResponse, getCorsHeaders, Logger, requireEnv } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const VOICE_PRESETS: Record<string, { voiceId: string; label: string; isCloned?: boolean }> = {
  // Masculinas
  'grave':      { voiceId: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Grave)' },
  'roger':      { voiceId: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger (Narrador)' },
  'animado':    { voiceId: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (Animado)' },
  'misterioso': { voiceId: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Misterioso)' },
  'brian':      { voiceId: 'nPczCjzI2devNBz1zQrb', label: 'Brian' },
  'bill':       { voiceId: 'pqHfZKP75CvOlQylNhV4', label: 'Bill' },
  'eric':       { voiceId: 'cjVigY5qzO86Huf0OWal', label: 'Eric' },
  'will':       { voiceId: 'bIHbv24MWmeRgasZH58o', label: 'Will' },
  'callum':     { voiceId: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum' },
  'charlie':    { voiceId: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie' },
  // Femininas
  'feminina':   { voiceId: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah' },
  'laura':      { voiceId: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura' },
  'alice':      { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice' },
  'matilda':    { voiceId: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda' },
  'jessica':    { voiceId: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica' },
  'lily':       { voiceId: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily' },
  // Neutras/Especiais
  'river':      { voiceId: 'SAz9YHcvj6GT2YYXdXww', label: 'River' },
  'robo':       { voiceId: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Robô)' },
  'glitch':     { voiceId: 'kPtEHAvRnjUJFv7SK9WI', label: 'Glitch' },
  // Temáticas
  'santa':      { voiceId: 'MDLAMJ0jxkpYkjXbmG4t', label: 'Papai Noel' },
  'mrs_claus':  { voiceId: 'SAhdygBsjizE9aIj39dz', label: 'Mamãe Noel' },
  'elf':        { voiceId: 'e79twtVS2278lVZZQiAD', label: 'Elfo' },
  'reindeer':   { voiceId: 'h6u4tPKmcPlxUdZOaVpH', label: 'Rena' },
  // Infantis
  'crianca_f':  { voiceId: '21m00Tcm4TlvDq8ikWAM', label: 'Criança (Menina)' },
  'crianca_m':  { voiceId: 'AZnzlk1XhkKW9D2mID8L', label: 'Criança (Menino)' },
  // Idosos
  'idoso':      { voiceId: 'N2lVS1w4EtoT3dr4eOWO', label: 'Idoso (Vovô)' },
  'idosa':      { voiceId: 'XrExE9yKIg1WjnnlVkGX', label: 'Idosa (Vovó)' },
  // Cloned Placeholder (Exemplo para bloqueio)
  'cloned_sample': { voiceId: 'cloned_id_123', label: 'Celebridade X', isCloned: true },
};

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("voice-changer");

  try {
    const supabaseClient = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    );

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const voicePreset = formData.get('voice_preset') as string || 'grave';
    const taskId = formData.get('task_id') as string;

    if (!audioFile) {
      return errorResponse('Audio file is required', 400, req);
    }

    const preset = VOICE_PRESETS[voicePreset];
    if (!preset) {
      return errorResponse(`Invalid voice preset: ${voicePreset}`, 400, req);
    }

    // Initialize telemetry
    const startTime = Date.now();
    const telemetryData: any = {
      task_id: taskId,
      input_size_bytes: audioFile.size,
      metadata: { preset: voicePreset }
    };

    try {
      if (taskId) {
        await supabaseClient
          .from('voice_conversion_queue')
          .update({ status: 'processing' })
          .eq('id', taskId);
      }

      const elevenlabsKey = requireEnv('ELEVENLABS_API_KEY');
      const apiFormData = new FormData();
      apiFormData.append('audio', audioFile);
      apiFormData.append('model_id', 'eleven_multilingual_sts_v2');
      apiFormData.append('voice_settings', JSON.stringify({
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      }));

      const stsResponse = await fetch(
        `https://api.elevenlabs.io/v1/speech-to-speech/${preset.voiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: { 'xi-api-key': elevenlabsKey },
          body: apiFormData,
        }
      );

      telemetryData.status_code = stsResponse.status;
      telemetryData.response_time_ms = Date.now() - startTime;

      if (!stsResponse.ok) {
        const errText = await stsResponse.text();
        telemetryData.error_type = stsResponse.status.toString();
        
        if (taskId) {
          await supabaseClient
            .from('voice_conversion_queue')
            .update({ status: 'failed', error_message: `ElevenLabs Error: ${stsResponse.status}` })
            .eq('id', taskId);
        }
        
        return errorResponse(`STS Failed: ${stsResponse.status}`, 502, req);
      }

      const audioBuffer = await stsResponse.arrayBuffer();

      if (taskId) {
        await supabaseClient
          .from('voice_conversion_queue')
          .update({ status: 'completed' })
          .eq('id', taskId);
      }

      // Record successful telemetry
      await supabaseClient.from('sts_telemetry').insert(telemetryData);

      return new Response(audioBuffer, {
        status: 200,
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'audio/mpeg',
        },
      });

    } catch (innerErr: any) {
      telemetryData.error_type = 'EXCEPTION';
      telemetryData.metadata.error = innerErr.message;
      await supabaseClient.from('sts_telemetry').insert(telemetryData);
      
      if (taskId) {
        await supabaseClient
          .from('voice_conversion_queue')
          .update({ status: 'failed', error_message: innerErr.message })
          .eq('id', taskId);
      }
      throw innerErr;
    }
  } catch (err: any) {
    log.error("Global Voice Changer Error", { error: err.message });
    return errorResponse(err.message || 'Internal Error', 500, req);
  }
});
