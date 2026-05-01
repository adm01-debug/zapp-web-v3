import { supabase } from '@/integrations/supabase/client';

export const whatsappConnectionRepository = {
  async fetchConnections() {
    return supabase
      .from('whatsapp_connections')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async updateConnection(id: string, updates: any) {
    return supabase
      .from('whatsapp_connections')
      .update(updates)
      .eq('id', id);
  },

  async insertConnection(data: any) {
    return supabase.from('whatsapp_connections').insert(data).select().single();
  },

  async logQrAttempt(data: any) {
    return supabase.from('qr_attempts').insert(data).select('id').single();
  },

  async updateQrAttempt(id: string, updates: any) {
    return supabase.from('qr_attempts').update(updates).eq('id', id);
  },

  async callEvolutionApi(body: any) {
    return supabase.functions.invoke('evolution-api', { body });
  },

  async callEvolutionApiV2(path: string, options: any) {
    return supabase.functions.invoke(path, options);
  }
};
