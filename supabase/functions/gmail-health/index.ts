
import { gmailHealthService, GmailHealthInfo, GmailFailure } from '@/services/gmailHealthService';

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'POST' && action === 'revalidate') {
      await gmailHealthService.forceRevalidation();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const health = await gmailHealthService.getHealthStatus();
    
    // Paginação e filtros para falhas
    const requestId = url.searchParams.get('requestId') || undefined;
    const operation = url.searchParams.get('operation') || undefined;
    const resource = url.searchParams.get('resource') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    const failuresResult = gmailHealthService.getFailures({
      requestId,
      operation,
      resource,
      page,
      pageSize
    });

    return new Response(JSON.stringify({
      ...health,
      failuresResult
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
