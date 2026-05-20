/**
 * Gera um hash SHA-256 de um Blob ou File para identificação única de mídia.
 * Usado para cache de mídia no Evolution API (evitar re-uploads).
 */
export async function calculateFileHash(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
