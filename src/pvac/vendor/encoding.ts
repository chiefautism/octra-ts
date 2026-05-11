/**
 * Encoding utilities for PVAC cipher and proof wire formats.
 * Matches the Octra consensus format used by webcli, extension, mobile, desktop.
 */

const CIPHER_PREFIX = 'hfhe_v1|';
const PROOF_PREFIX = 'zkzp_v2|';

/** Encode raw cipher bytes to Octra wire format: hfhe_v1|<base64> */
export function encodeCipher(cipher: Uint8Array): string {
  return CIPHER_PREFIX + uint8ToBase64(cipher);
}

/** Decode Octra wire format cipher to raw bytes. Strips hfhe_v1| prefix if present. */
export function decodeCipher(encoded: string): Uint8Array {
  const raw = encoded.startsWith(CIPHER_PREFIX) ? encoded.slice(CIPHER_PREFIX.length) : encoded;
  return base64ToUint8(raw);
}

/** Encode raw proof bytes to Octra wire format: zkzp_v2|<base64> */
export function encodeProof(proof: Uint8Array): string {
  return PROOF_PREFIX + uint8ToBase64(proof);
}

/** Decode Octra wire format proof to raw bytes. Strips zkzp_v2| prefix if present. */
export function decodeProof(encoded: string): Uint8Array {
  const raw = encoded.startsWith(PROOF_PREFIX) ? encoded.slice(PROOF_PREFIX.length) : encoded;
  return base64ToUint8(raw);
}

/** Uint8Array → base64 string (browser-compatible) */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Base64 string → Uint8Array */
export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Uint8Array → hex string */
export function uint8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Hex string → Uint8Array */
export function hexToUint8(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
