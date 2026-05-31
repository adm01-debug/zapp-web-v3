// Generic rate limiter for Edge Functions using the database as a shared state.
// Supports instance-based and event-based throttling.

// deno-lint-ignore no-explicit-any
export async function checkRateLimit(supabase: any, {
  instanceId,
  eventType,
  limit = 100, // events per window
  windowSeconds = 60,
}: {
  instanceId: string;
  eventType: string;
  limit?: number;
  windowSeconds?: number;
}): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - (windowSeconds * 1000));

  try {
    // 1. Clean up old windows (or just rely on the query to filter)
    // 2. Upsert/Increment the current window
    // We use a simplified bucket approach: one record per instance+event+minute
    const bucket = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * (windowSeconds * 1000)).toISOString();
    
    // Using an RPC or a sophisticated upsert with increment would be better,
    // but here we'll do a select-then-upsert for simplicity in this environment.
    const { data, error } = await supabase
      .from('webhook_rate_limits')
      .select('id, event_count')
      .eq('instance_id', instanceId)
      .eq('event_type', eventType)
      .eq('window_start', bucket)
      .maybeSingle();

    if (error) {
      console.warn('[rate-limiter] error reading limits:', error.message);
      return { allowed: true, currentCount: 0, limit }; // Fail open
    }

    const currentCount = (data?.event_count ?? 0) + 1;
    
    if (currentCount > limit) {
      return { allowed: false, currentCount, limit };
    }

    const { error: upsertError } = await supabase
      .from('webhook_rate_limits')
      .upsert({
        id: data?.id,
        instance_id: instanceId,
        event_type: eventType,
        window_start: bucket,
        event_count: currentCount,
        created_at: now.toISOString(),
      }, { onConflict: 'instance_id,event_type,window_start' });

    if (upsertError) {
      console.warn('[rate-limiter] error updating limits:', upsertError.message);
    }

    return { allowed: true, currentCount, limit };
  } catch (e) {
    console.warn('[rate-limiter] unexpected error:', (e as Error).message);
    return { allowed: true, currentCount: 0, limit }; // Fail open
  }
}
