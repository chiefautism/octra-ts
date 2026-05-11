/**
 * Build transaction payloads for encrypt/decrypt operations.
 * These match the exact JSON format expected by Octra consensus.
 *
 * CANONICAL FORMAT (all platforms must match):
 *   { cipher, amount_commitment, zero_proof, blinding [, range_proof_balance] }
 */

import type { PvacContext } from './context.js';
import type { Cipher } from './types.js';
import { uint8ToBase64 } from './encoding.js';

/**
 * Build the encrypted_data JSON for an encrypt transaction.
 *
 * @param ctx - Initialized PvacContext
 * @param amount - Amount in microOCT as bigint (e.g., 1000000n = 1 OCT)
 * @returns JSON string ready for encrypted_data field
 */
export function buildEncryptPayload(ctx: PvacContext, amount: bigint): string {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const blinding = crypto.getRandomValues(new Uint8Array(32));

  const cipher = ctx.encryptSeeded(amount, seed);
  const { commitment } = ctx.pedersenCommit(amount, blinding);
  const { proof } = ctx.makeBoundProof(cipher, amount, blinding);

  return JSON.stringify({
    cipher: ctx.encodeCipher(cipher),
    amount_commitment: uint8ToBase64(commitment),
    zero_proof: ctx.encodeZeroProof(proof),
    blinding: uint8ToBase64(blinding),
  });
}

/**
 * Build the encrypted_data JSON for a decrypt transaction.
 * WARNING: makeRangeProof is slow (30-60s+).
 *
 * @param ctx - Initialized PvacContext
 * @param amount - Amount to decrypt in microOCT as bigint
 * @param currentCipher - Current encrypted balance (raw bytes, no prefix)
 * @param currentBalance - Current decrypted balance in microOCT as bigint
 * @returns JSON string ready for encrypted_data field
 */
export function buildDecryptPayload(
  ctx: PvacContext,
  amount: bigint,
  currentCipher: Cipher,
  currentBalance: bigint,
): string {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const blinding = crypto.getRandomValues(new Uint8Array(32));

  const cipher = ctx.encryptSeeded(amount, seed);
  const { commitment } = ctx.pedersenCommit(amount, blinding);
  const { proof } = ctx.makeBoundProof(cipher, amount, blinding);

  const newBalanceCipher = ctx.ctSub(currentCipher, cipher);
  const newBalanceValue = currentBalance - amount;

  if (newBalanceValue < 0n) {
    throw new Error(`Insufficient encrypted balance: have ${currentBalance}, need ${amount}`);
  }

  const rangeProof = ctx.makeRangeProofParallel(newBalanceCipher, newBalanceValue);

  return JSON.stringify({
    cipher: ctx.encodeCipher(cipher),
    amount_commitment: uint8ToBase64(commitment),
    zero_proof: ctx.encodeZeroProof(proof),
    blinding: uint8ToBase64(blinding),
    range_proof_balance: ctx.encodeRangeProof(rangeProof),
  });
}
