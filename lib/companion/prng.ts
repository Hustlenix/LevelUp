/** Deterministic seeded PRNG for the companion core. No Math.random() in behaviour. */

export function hashSeed(...parts: Array<string | number>): number {
  const input = parts.join("\u0000");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 1831565813) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIndex(prng: () => number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.floor(prng() * length));
}
