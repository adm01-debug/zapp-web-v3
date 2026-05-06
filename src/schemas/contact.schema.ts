import { z } from "zod";

export const contactSchema = z.object({
  remote_jid: z.string().regex(/^[0-9]+@s\.whatsapp\.net$/, "Formato de JID inválido"),
  push_name: z.string().min(1, "Nome é obrigatório"),
  profile_picture_url: z.string().url().optional().nullable(),
  instance_name: z.string().default("wpp2"),
  assigned_to: z.string().uuid().optional().nullable(),
  lead_status: z.enum(['new', 'qualified', 'hot', 'cold', 'customer', 'deleted']).default('new'),
  notes: z.string().optional().nullable(),
});

export type ContactInput = z.infer<typeof contactSchema>;
