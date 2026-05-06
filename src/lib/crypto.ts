/**
 * Utilitários de criptografia leve para o frontend.
 */
export async function buildFileHash(content: string | Blob): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  
  if (content instanceof Blob) {
    arrayBuffer = await content.arrayBuffer();
  } else {
    arrayBuffer = new TextEncoder().encode(content).buffer;
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


