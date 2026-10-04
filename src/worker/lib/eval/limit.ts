/**
 * Bounded body reader for untrusted fetches (PRD M9).
 * Never buffers more than `limit` bytes from the network.
 */

export async function readCappedText(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        chunks.push(value);
        size += value.byteLength;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const kept = Math.min(size, limit);
  const merged = new Uint8Array(kept);
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = kept - offset;
    if (remaining <= 0) break;
    const take = Math.min(chunk.byteLength, remaining);
    merged.set(chunk.subarray(0, take), offset);
    offset += take;
  }
  return new TextDecoder().decode(merged);
}

export function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
