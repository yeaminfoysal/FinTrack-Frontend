/**
 * UUID v4 generator. Uses global crypto.getRandomValues when available
 * (Hermes exposes it), else falls back to Math.random. IDs are client-
 * generated and shared with the server, so uniqueness matters more than
 * cryptographic strength for this single-user app.
 */
export function uuidv4(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.randomUUID) {
    try {
      return g.crypto.randomUUID();
    } catch {
      // fall through
    }
  }

  const bytes = new Uint8Array(16);
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Per RFC 4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 256; i++) hex.push((i + 0x100).toString(16).slice(1));
  return (
    hex[bytes[0]] +
    hex[bytes[1]] +
    hex[bytes[2]] +
    hex[bytes[3]] +
    '-' +
    hex[bytes[4]] +
    hex[bytes[5]] +
    '-' +
    hex[bytes[6]] +
    hex[bytes[7]] +
    '-' +
    hex[bytes[8]] +
    hex[bytes[9]] +
    '-' +
    hex[bytes[10]] +
    hex[bytes[11]] +
    hex[bytes[12]] +
    hex[bytes[13]] +
    hex[bytes[14]] +
    hex[bytes[15]]
  );
}
