import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/** Schema para análise de conversa (ai-conversation-summary) */
export const AiConversationSummarySchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  contactName: z.string().optional().nullable(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system', 'agent', 'client']),
    content: z.string(),
    sender: z.string().optional(),
    timestamp: z.string().optional(),
  })).min(1, "Lista de mensagens vazia"),
});

/** Schema para sugestão de resposta (ai-suggest-reply) */
export const AiSuggestReplySchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })),
  context: z.string().optional(),
});

/** Helper para parse seguro */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }
  return { success: true, data: result.data };
}
