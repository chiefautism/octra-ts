/**
 * PrivateTransfer — high-level API for privacy-preserving transfers on Octra.
 *
 * Wraps the low-level FHE operations into simple, one-call functions:
 * - privateEncrypt: move public OCT into encrypted balance
 * - privateDecrypt: move encrypted OCT back to public balance
 * - privateSend: stealth transfer to another address (FHE + stealth tag + AES)
 *
 * Usage:
 *   const tx = await PrivateTransfer.encrypt(ctx, 1_000_000n); // 1 OCT
 *   // tx.encrypted_data is ready for SDK callContract
 */

import type { PvacContext } from './context.js';
import type { Cipher } from './types.js';
import { uint8ToBase64 } from './encoding.js';

/** Result of a private transfer operation — ready to submit to chain */
export interface TransferResult {
  /** JSON string for the encrypted_data field */
  encrypted_data: string;
  /** Operation type for the transaction */
  op_type: 'encrypt' | 'decrypt';
  /** Amount in microOCT */
  amount: bigint;
  /** Time taken in milliseconds */
  elapsed_ms: number;
}

/** Progress callback for long-running operations */
export type ProgressCallback = (phase: string, pct: number) => void;

export const PrivateTransfer = {
  /**
   * Encrypt public OCT into encrypted balance.
   * Fast (~1s) — no range proof needed.
   *
   * @param ctx - Initialized PvacContext
   * @param amount - Amount in microOCT (e.g., 1_000_000n = 1 OCT)
   * @param onProgress - Optional progress callback
   */
  encrypt(ctx: PvacContext, amount: bigint, onProgress?: ProgressCallback): TransferResult {
    if (amount <= 0n) throw new Error('Amount must be positive');
    const t0 = performance.now();

    onProgress?.('generating-seed', 10);
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const blinding = crypto.getRandomValues(new Uint8Array(32));

    onProgress?.('encrypting', 30);
    const cipher = ctx.encryptSeeded(amount, seed);

    onProgress?.('commitment', 50);
    const { commitment } = ctx.pedersenCommit(amount, blinding);

    onProgress?.('bound-proof', 70);
    const { proof } = ctx.makeBoundProof(cipher, amount, blinding);

    onProgress?.('encoding', 90);
    const encrypted_data = JSON.stringify({
      cipher: ctx.encodeCipher(cipher),
      amount_commitment: uint8ToBase64(commitment),
      zero_proof: ctx.encodeZeroProof(proof),
      blinding: uint8ToBase64(blinding),
    });

    onProgress?.('done', 100);
    return { encrypted_data, op_type: 'encrypt', amount, elapsed_ms: performance.now() - t0 };
  },

  /**
   * Decrypt encrypted OCT back to public balance.
   * SLOW (30-60s) — requires range proof to prove remaining balance ≥ 0.
   *
   * @param ctx - Initialized PvacContext
   * @param amount - Amount to decrypt in microOCT
   * @param currentCipher - Current encrypted balance (raw bytes, no prefix)
   * @param currentBalance - Current decrypted balance in microOCT
   * @param onProgress - Optional progress callback
   */
  decrypt(
    ctx: PvacContext,
    amount: bigint,
    currentCipher: Cipher,
    currentBalance: bigint,
    onProgress?: ProgressCallback,
  ): TransferResult {
    if (amount <= 0n) throw new Error('Amount must be positive');
    if (amount > currentBalance) {
      throw new Error(`Insufficient encrypted balance: have ${currentBalance}, need ${amount}`);
    }
    const t0 = performance.now();

    onProgress?.('generating-seed', 5);
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const blinding = crypto.getRandomValues(new Uint8Array(32));

    onProgress?.('encrypting', 10);
    const cipher = ctx.encryptSeeded(amount, seed);

    onProgress?.('commitment', 15);
    const { commitment } = ctx.pedersenCommit(amount, blinding);

    onProgress?.('bound-proof', 20);
    const { proof } = ctx.makeBoundProof(cipher, amount, blinding);

    onProgress?.('computing-new-balance', 25);
    const newBalanceCipher = ctx.ctSub(currentCipher, cipher);
    const newBalanceValue = currentBalance - amount;

    onProgress?.('range-proof', 30);
    // This is the slow part — 30-60s
    const rangeProof = ctx.makeRangeProofParallel(newBalanceCipher, newBalanceValue);

    onProgress?.('encoding', 95);
    const encrypted_data = JSON.stringify({
      cipher: ctx.encodeCipher(cipher),
      amount_commitment: uint8ToBase64(commitment),
      zero_proof: ctx.encodeZeroProof(proof),
      blinding: uint8ToBase64(blinding),
      range_proof_balance: ctx.encodeRangeProof(rangeProof),
    });

    onProgress?.('done', 100);
    return { encrypted_data, op_type: 'decrypt', amount, elapsed_ms: performance.now() - t0 };
  },
};
