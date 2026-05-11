import type { NormalizedTransaction, OctraAddress, SignedTransaction, UnsignedTransaction } from '../types.js';
import { toRawAmount } from './amount.js';

export function normalizeTransaction(transaction: UnsignedTransaction): NormalizedTransaction {
  return {
    from: transaction.from,
    to_: transaction.to,
    amount: toRawAmount(transaction.amount),
    nonce: transaction.nonce,
    ou: toRawAmount(transaction.ou),
    timestamp: transaction.timestamp ?? Date.now() / 1000,
    op_type: transaction.opType ?? 'standard',
    ...(transaction.encryptedData ? { encrypted_data: transaction.encryptedData } : {}),
    ...(transaction.message ? { message: transaction.message } : {}),
  };
}

export function canonicalTransactionJson(transaction: UnsignedTransaction | NormalizedTransaction): string {
  const tx = 'to_' in transaction ? transaction : normalizeTransaction(transaction);
  const pieces = [
    `"from":${JSON.stringify(tx.from)}`,
    `"to_":${JSON.stringify(tx.to_)}`,
    `"amount":${JSON.stringify(tx.amount)}`,
    `"nonce":${String(tx.nonce)}`,
    `"ou":${JSON.stringify(tx.ou)}`,
    `"timestamp":${formatJsonNumber(tx.timestamp)}`,
    `"op_type":${JSON.stringify(tx.op_type || 'standard')}`,
  ];
  if (tx.encrypted_data) pieces.push(`"encrypted_data":${JSON.stringify(tx.encrypted_data)}`);
  if (tx.message) pieces.push(`"message":${JSON.stringify(tx.message)}`);
  return `{${pieces.join(',')}}`;
}

export function serializeTransactionForRpc(
  transaction: NormalizedTransaction,
  signature: string,
  publicKey: string,
): SignedTransaction {
  return {
    ...transaction,
    signature,
    public_key: publicKey,
  };
}

export function encryptedBalanceMessage(address: OctraAddress): string {
  return `octra_encryptedBalance|${address}`;
}

export function registerPublicKeyMessage(address: OctraAddress): string {
  return `register_pubkey:${address}`;
}

export function defaultTransferOu(rawAmount: bigint | number | string): string {
  return BigInt(rawAmount) < 1_000_000_000n ? '10000' : '30000';
}

function formatJsonNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error('JSON number must be finite');
  return JSON.stringify(value);
}
