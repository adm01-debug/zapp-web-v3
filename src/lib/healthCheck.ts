/**
 * Health check utility for ZAPP WEB.
 *
 * Checks connectivity to all critical services and returns
 * a structured health status. Useful for:
 * - Admin dashboard health panel
 * - Automated monitoring scripts
 * - Connection troubleshooting
 */

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
  latencyMs: number;
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  latencyMs: number;
  message?: string;
}

/**
 * Runs all health checks and returns the overall status.
 */
export async function runHealthCheck(): Promise<HealthStatus> {
  const start = performance.now();
  const checks: HealthCheck[] = [];

  // 1. Supabase DB connectivity
  checks.push(await checkSupabase());

  // 2. Supabase Auth
  checks.push(await checkAuth());

  // 3. Supabase Realtime
  checks.push(await checkRealtime());

  // 4. Evolution API
  checks.push(await checkEvolutionApi());

  const totalLatency = Math.round(performance.now() - start);
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  const status: HealthStatus = {
    status: failCount > 0 ? 'unhealthy' : warnCount > 0 ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    checks,
    latencyMs: totalLatency,
  };

  log.info('[HealthCheck]', status.status, `(${totalLatency}ms)`);
  return status;
}

async function checkSupabase(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Math.round(performance.now() - start);

    if (error) {
      return { name: 'supabase_db', status: 'fail', latencyMs: latency, message: error.message };
    }

    return {
      name: 'supabase_db',
      status: latency > 2000 ? 'warn' : 'pass',
      latencyMs: latency,
      message: latency > 2000 ? 'High latency' : undefined,
    };
  } catch (err) {
    return {
      name: 'supabase_db',
      status: 'fail',
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function checkAuth(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const { data, error: res2428Err } = await supabase.auth.getSession();
    const latency = Math.round(performance.now() - start);

    return {
      name: 'supabase_auth',
      status: data.session ? 'pass' : 'warn',
      latencyMs: latency,
      message: data.session ? undefined : 'No active session',
    };
  } catch (err) {
    return {
      name: 'supabase_auth',
      status: 'fail',
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function checkRealtime(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    // Check if realtime is accessible by checking the connection state
    const channels = supabase.getChannels();
    const latency = Math.round(performance.now() - start);

    return {
      name: 'supabase_realtime',
      status: 'pass',
      latencyMs: latency,
      message: `${channels.length} active channels`,
    };
  } catch (err) {
    return {
      name: 'supabase_realtime',
      status: 'warn',
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function checkEvolutionApi(): Promise<HealthCheck> {
  const start = performance.now();
  const evolutionUrl = import.meta.env.VITE_EVOLUTION_API_URL;

  if (!evolutionUrl) {
    return {
      name: 'evolution_api',
      status: 'warn',
      latencyMs: 0,
      message: 'VITE_EVOLUTION_API_URL not configured',
    };
  }

  try {
    const response = await fetch(`${evolutionUrl}/instance/connectionState/wpp2`, {
      method: 'GET',
      headers: {
        apikey: import.meta.env.VITE_EVOLUTION_API_KEY || '',
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Math.round(performance.now() - start);

    return {
      name: 'evolution_api',
      status: response.ok ? 'pass' : 'warn',
      latencyMs: latency,
      message: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      name: 'evolution_api',
      status: 'fail',
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : 'Unreachable',
    };
  }
}
