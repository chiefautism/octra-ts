import type { OctraAddress } from '../types.js';
import { base58Encode, isBase58, sha256 } from './bytes.js';

export function publicKeyToAddress(publicKey: Uint8Array): OctraAddress {
  if (publicKey.length !== 32) throw new Error('Octra public key must be 32 bytes');
  let encoded = base58Encode(sha256(publicKey));
  while (encoded.length < 44) encoded = `1${encoded}`;
  return `oct${encoded}` as OctraAddress;
}

export function isAddress(value: string): value is OctraAddress {
  return value.length === 47 && value.startsWith('oct') && isBase58(value.slice(3));
}

export function assertAddress(value: string): asserts value is OctraAddress {
  if (!isAddress(value)) throw new Error(`Invalid Octra address: ${value}`);
}
