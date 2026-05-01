import { whatsappConnectionRepository } from '../data-access/whatsappConnectionRepository';
import { supabase } from '@/integrations/supabase/client';

export const whatsappConnectionService = {
  generateInstanceName(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30) +
      '_' + Date.now().toString().slice(-6);
  },

  detectQrTtlMs(result: unknown) {
    const QR_TTL_DEFAULT_MS = 60_000;
    const QR_TTL_MIN_MS = 15_000;
    const QR_TTL_MAX_MS = 300_000;

    if (!result || typeof result !== 'object') return { ttlMs: QR_TTL_DEFAULT_MS, source: 'default' };
    const r = result as any;
    const candidates = [
      r.count,
      r.qrcode?.count,
      r.ttl,
      r.qrcode?.ttl,
      r.expires_in,
    ];
    for (const raw of candidates) {
      const seconds = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
      if (Number.isFinite(seconds) && seconds > 0) {
        const ms = seconds * 1000;
        const clamped = Math.min(QR_TTL_MAX_MS, Math.max(QR_TTL_MIN_MS, ms));
        return { ttlMs: clamped, source: clamped !== ms ? 'clamped' : 'detected' };
      }
    }
    return { ttlMs: QR_TTL_DEFAULT_MS, source: 'default' };
  },

  async logQrAttempt(connId: string, instanceId: string, name: string, status: string = 'pending') {
    const { data: userData } = await supabase.auth.getUser();
    return whatsappConnectionRepository.logQrAttempt({
      connection_id: connId,
      instance_id: instanceId,
      connection_name: name,
      status,
      requested_by: userData.user?.id ?? null,
    });
  },

  async requestQrCode(instanceId: string) {
    const { data, error } = await whatsappConnectionRepository.callEvolutionApi({
      action: 'connect',
      instanceName: instanceId
    });

    if (error) throw new Error(error.message || 'Erro ao gerar QR Code');
    if (data?.error === true) {
      throw new Error(data.message || 'Erro ao gerar QR Code');
    }
    return data;
  }
};
