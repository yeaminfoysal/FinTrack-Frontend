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

/**
 * A UUID derived from `seed` — the same seed always gives the same id, on every device.
 * Lets two devices generate the same recurring occurrence and have it collapse into one
 * row on sync instead of becoming a duplicate. Hashing only, never for anything secret.
 */
export function uuidFrom(seed: string): string {
  // xmur3: mixes the string into a 32-bit state, then emits well-spread values from it.
  let h = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x85ebca6b);
    h = (h << 13) | (h >>> 19);
  }
  const next = () => {
    h = Math.imul(h ^ (h >>> 16), 0x2246f4ca);
    h = Math.imul(h ^ (h >>> 13), 0x3266489d);
    h ^= h >>> 16;
    return h >>> 0;
  };

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 4) {
    const word = next();
    bytes[i] = word >>> 24;
    bytes[i + 1] = (word >>> 16) & 0xff;
    bytes[i + 2] = (word >>> 8) & 0xff;
    bytes[i + 3] = word & 0xff;
  }
  // Same version/variant bits as uuidv4, so the server's UUID validation accepts it.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => (b + 0x100).toString(16).slice(1));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
