/**
 * Client-side encryption for hub rows.
 *  - Key: PBKDF2-SHA256 (310k iterations) from the household passphrase -> AES-GCM-256, derived ONCE and stored as a
 *    non-extractable CryptoKey in IndexedDB, so the passphrase itself is never persisted.
 *  - Salt: deterministic per app (so every phone derives the same key from the same passphrase). The passphrase is
 *    what carries the strength, so pick a long one.
 *  - Each row is encrypted with a fresh random IV; the row's identity (`app/table/id`) is bound as AAD so a malicious
 *    or buggy server cannot swap one encrypted row for another.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();
const ITER = 310_000;

export class PassphraseError extends Error { constructor() { super('Wrong passphrase for this data'); this.name = 'PassphraseError'; } }

const b64 = (u: Uint8Array) => { let s = ''; for (const b of u) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function deriveKey(app: string, passphrase: string): Promise<CryptoKey> {
  const salt = await crypto.subtle.digest('SHA-256', enc.encode(`hub-v1:${app}`));
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJson(key: CryptoKey, aad: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, enc.encode(JSON.stringify(value))));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv); out.set(ct, iv.length);
  return b64(out);
}

export async function decryptJson<T = unknown>(key: CryptoKey, aad: string, payload: string): Promise<T> {
  try {
    const raw = unb64(payload);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: enc.encode(aad) }, key, raw.slice(12));
    return JSON.parse(dec.decode(pt)) as T;
  } catch {
    throw new PassphraseError();
  }
}
