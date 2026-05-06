/**
 * Utilitários de criptografia leve para o frontend.
 */
export async function buildFileHash(content: string | Blob): Promise<string> {
  let msgUint8: Uint8Array;
  
  if (content instanceof Blob) {
    const arrayBuffer = await content.arrayBuffer();
    msgUint8 = new Uint8Array(arrayBuffer);
  } else {
    msgUint8 = new TextEncoder().encode(content);
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

