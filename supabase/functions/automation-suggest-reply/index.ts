// Edge function: gera sugestão de resposta para uma execução de automação
// Usa Lovable AI Gateway (sem API key do usuário)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  executionId: string;
  remoteJid: string;
  ruleId: string;
  recentMessages?: Array<{ from_me: boolean; content: string }>;
  contactName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const body = (await req.json()) as Body;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: rule, error: ruleErr } = await supabase
      .from("automation_rules")
      .select("name, description, actions, trigger_type")
      .eq("id", body.ruleId)
      .maybeSingle();
    if (ruleErr || !rule) throw new Error("Rule not found");

    const actions = (rule.actions ?? {}) as Record<string, unknown>;
    const customPrompt = (actions.ai_prompt as string) ?? "";
    const template = (actions.template as string) ?? "";

    let suggestion = template;

    if (!template || customPrompt) {
      const history = (body.recentMessages ?? [])
        .slice(-8)
        .map((m) => `${m.from_me ? "Atendente" : "Cliente"}: ${m.content}`)
        .join("\n");

      const systemPrompt = `Você é um assistente de atendimento via WhatsApp. Gere UMA resposta curta (máx 2 frases), profissional e cordial, em PT-BR. Não use saudações redundantes se a conversa já está em andamento. Não invente informações.${customPrompt ? `\n\nContexto da regra: ${customPrompt}` : ""}`;

      const userPrompt = `Regra disparada: ${rule.name} (${rule.trigger_type})
Cliente: ${body.contactName ?? "—"}
Histórico recente:
${history || "(sem mensagens)"}

Gere a melhor próxima resposta do atendente.`;

      const aiResp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        },
      );

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados na workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!aiResp.ok) throw new Error(`AI gateway: ${aiResp.status}`);

      const aiJson = await aiResp.json();
      suggestion =
        aiJson?.choices?.[0]?.message?.content?.trim?.() ?? template ?? "";
    }

    await supabase
      .from("automation_executions")
      .update({ suggestion_text: suggestion })
      .eq("id", body.executionId);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("automation-suggest-reply error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
