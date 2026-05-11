/**
 * StealthAddress — stealth payment system for Octra.
 *
 * Implements the full stealth address lifecycle:
 * - Generate: derive view keypair from wallet private key
 * - Send: create stealth output (ephemeral key + tag + encrypted amount)
 * - Scan: check if outputs belong to you
 * - Claim: compute claim secret to spend received stealth funds
 *
 * Protocol:
 * 1. Sender generates ephemeral x25519 keypair
 * 2. ECDH(ephemeral_sk, recipient_view_pub) → shared secret
 * 3. SHA-256(shared_secret || "OCTRA_STEALTH_TAG_V1")[0:16] → stealth tag
 * 4. AES-256-GCM(shared_secret, amount || blinding) → encrypted amount
 * 5. Recipient scans: ECDH(view_sk, ephemeral_pub) → same shared secret → check tag
 *
 * Uses x25519 (Curve25519 ECDH) + SHA-256 + AES-256-GCM.
 * Browser-compatible: uses SubtleCrypto where available, falls back to pure JS.
 */

const STEALTH_TAG_DOMAIN = 'OCTRA_STEALTH_TAG_V1';
const CLAIM_SECRET_DOMAIN = 'OCTRA_CLAIM_SECRET_V1';
const CLAIM_BIND_DOMAIN = 'OCTRA_CLAIM_BIND_V1';

// ── Minimal x25519 + crypto helpers (no external deps) ──

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function uint64LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  const dv = new DataView(buf.buffer);
  dv.setBigUint64(0, n, true);
  return buf;
}

function readUint64LE(buf: Uint8Array): bigint {
  const dv = new DataView(buf.buffer, buf.byteOffset, 8);
  return dv.getBigUint64(0, true);
}

function toBase64(bytes: Uint8Array): string {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', toBufferSource(data));
  return new Uint8Array(hash);
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey('raw', toBufferSource(key.slice(0, 32)), 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, toBufferSource(plaintext));
  return concat(nonce, new Uint8Array(ct));
}

async function aesGcmDecrypt(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const nonce = data.slice(0, 12);
  const ct = data.slice(12);
  const aesKey = await crypto.subtle.importKey('raw', toBufferSource(key.slice(0, 32)), 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, ct);
  return new Uint8Array(pt);
}

// x25519 requires a library — dynamically import tweetnacl or use SubtleCrypto X25519
async function x25519(sk: Uint8Array, pk: Uint8Array): Promise<Uint8Array> {
  try {
    // Try SubtleCrypto X25519 (Chrome 113+, Safari 17+)
    const privKey = await crypto.subtle.importKey('raw', toBufferSource(sk), { name: 'X25519' } as any, false, ['deriveBits']);
    const pubKey = await crypto.subtle.importKey('raw', toBufferSource(pk), { name: 'X25519' } as any, true, []);
    const bits = await crypto.subtle.deriveBits({ name: 'X25519', public: pubKey } as any, privKey, 256);
    return new Uint8Array(bits);
  } catch {
    // Fallback: dynamic import tweetnacl
    const nacl = await import('tweetnacl') as {
      default: { scalarMult: (secretKey: Uint8Array, publicKey: Uint8Array) => Uint8Array };
    };
    return nacl.default.scalarMult(sk, pk);
  }
}

function toBufferSource(bytes: Uint8Array): BufferSource {
  return new Uint8Array(bytes) as Uint8Array<ArrayBuffer>;
}

async function x25519Base(sk: Uint8Array): Promise<Uint8Array> {
  try {
    await crypto.subtle.generateKey({ name: 'X25519' } as any, true, ['deriveBits']);
    // Can't use generateKey for a specific sk, fallback to tweetnacl
    throw new Error('use tweetnacl');
  } catch {
    const nacl = await import('tweetnacl') as {
      default: { scalarMult: { base: (secretKey: Uint8Array) => Uint8Array } };
    };
    return nacl.default.scalarMult.base(sk);
  }
}

// ── Types ──

export interface ViewKeypair {
  viewSk: Uint8Array;
  viewPub: Uint8Array;
}

export interface EphemeralKeypair {
  ephSk: Uint8Array;
  ephPub: Uint8Array;
}

export interface StealthOutput {
  /** Ephemeral public key (base64) */
  ephPub: string;
  /** Stealth tag (hex, 16 bytes) */
  tag: string;
  /** AES-encrypted amount + blinding (base64) */
  encAmount: string;
}

export interface ScannedOutput {
  /** Index in the outputs array */
  index: number;
  /** Decrypted amount in microOCT */
  amount: bigint;
  /** Blinding factor (for proofs) */
  blinding: Uint8Array;
  /** Claim secret (for spending) */
  claimSecret: Uint8Array;
  /** Stealth tag (hex) */
  tag: string;
}

// ── StealthAddress API ──

export const StealthAddress = {
  /**
   * Derive view keypair from wallet private key.
   * The view key is used to scan for incoming stealth payments.
   *
   * @param privateKeyB64 - Wallet Ed25519 private key (base64, 64 bytes)
   */
  async deriveViewKeypair(privateKeyB64: string): Promise<ViewKeypair> {
    const seed = fromBase64(privateKeyB64).slice(0, 32);
    // SHA-512(seed) → clamp for Curve25519
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-512', seed));
    const viewSk = hash.slice(0, 32);
    viewSk[0] &= 248;
    viewSk[31] &= 127;
    viewSk[31] |= 64;
    const viewPub = await x25519Base(viewSk);
    return { viewSk, viewPub };
  },

  /**
   * Generate a random ephemeral keypair for sending a stealth payment.
   */
  async generateEphemeral(): Promise<EphemeralKeypair> {
    const ephSk = crypto.getRandomValues(new Uint8Array(32));
    ephSk[0] &= 248;
    ephSk[31] &= 127;
    ephSk[31] |= 64;
    const ephPub = await x25519Base(ephSk);
    return { ephSk, ephPub };
  },

  /**
   * Create a stealth output for sending a private payment.
   *
   * @param recipientViewPub - Recipient's view public key (Uint8Array, 32 bytes)
   * @param amount - Amount in microOCT
   * @param blinding - 32-byte blinding factor (for Pedersen commitment)
   */
  async createOutput(
    recipientViewPub: Uint8Array,
    amount: bigint,
    blinding: Uint8Array,
  ): Promise<{ output: StealthOutput; ephSk: Uint8Array }> {
    const { ephSk, ephPub } = await this.generateEphemeral();

    // ECDH → shared secret
    const rawShared = await x25519(ephSk, recipientViewPub);
    const shared = await sha256(rawShared);

    // Stealth tag
    const tagFull = await sha256(concat(shared, strToBytes(STEALTH_TAG_DOMAIN)));
    const tag = toHex(tagFull.slice(0, 16));

    // Encrypt amount + blinding
    const plaintext = concat(uint64LE(amount), blinding);
    const encAmount = toBase64(await aesGcmEncrypt(shared, plaintext));

    return {
      output: { ephPub: toBase64(ephPub), tag, encAmount },
      ephSk,
    };
  },

  /**
   * Scan outputs to find ones belonging to you.
   *
   * @param outputs - Array of stealth outputs to scan
   * @param viewSk - Your view secret key
   * @param address - Your Octra address (for claim binding)
   */
  async scan(
    outputs: Array<{ ephPub: string; tag: string; encAmount: string; index?: number }>,
    viewSk: Uint8Array,
    address: string,
  ): Promise<ScannedOutput[]> {
    const found: ScannedOutput[] = [];

    for (let i = 0; i < outputs.length; i++) {
      const out = outputs[i];
      try {
        const ephPub = fromBase64(out.ephPub);
        const rawShared = await x25519(viewSk, ephPub);
        const shared = await sha256(rawShared);

        // Check tag
        const tagFull = await sha256(concat(shared, strToBytes(STEALTH_TAG_DOMAIN)));
        const expectedTag = toHex(tagFull.slice(0, 16));

        if (expectedTag !== out.tag) continue; // Not ours

        // Decrypt amount
        const decrypted = await aesGcmDecrypt(shared, fromBase64(out.encAmount));
        const amount = readUint64LE(decrypted.slice(0, 8));
        const blinding = decrypted.slice(8, 40);

        // Claim secret
        const claimSecret = await sha256(concat(shared, strToBytes(CLAIM_SECRET_DOMAIN)));

        found.push({
          index: out.index ?? i,
          amount,
          blinding: new Uint8Array(blinding),
          claimSecret,
          tag: out.tag,
        });
      } catch {
        // Decryption failed — not ours, skip
        continue;
      }
    }

    return found;
  },

  /**
   * Compute the claim public key for spending a stealth output.
   * This is submitted on-chain to prove ownership.
   */
  async computeClaimPub(claimSecret: Uint8Array, recipientAddress: string): Promise<Uint8Array> {
    return sha256(concat(claimSecret, strToBytes(recipientAddress), strToBytes(CLAIM_BIND_DOMAIN)));
  },
};
