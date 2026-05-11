import { createHmac, createPrivateKey, createPublicKey, pbkdf2Sync, sign } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type { Account, Base64, OctraAddress, SignableMessage, UnsignedTransaction } from '../types.js';
import { base64ToBytes, bytesToBase64, bytesToHex, concatBytes, hexToBytes, sha256, utf8ToBytes } from '../utils/bytes.js';
import { publicKeyToAddress } from '../utils/address.js';
import {
  canonicalTransactionJson,
  encryptedBalanceMessage,
  normalizeTransaction,
  registerPublicKeyMessage,
  serializeTransactionForRpc,
} from '../utils/transaction.js';

const ed25519Pkcs8Prefix = hexToBytes('302e020100300506032b657004220420');

export type PrivateKeyInput = Base64 | `0x${string}` | Uint8Array;

export type MnemonicToAccountOptions = {
  /** Optional BIP-39 passphrase. */
  passphrase?: string;
  /** Deterministic child account index. */
  index?: number;
  /** Octra web wallet-compatible seed derivation version. */
  hdVersion?: 1 | 2;
};

export function privateKeyToAccount(privateKey: PrivateKeyInput): Account {
  const seed = normalizePrivateKey(privateKey);
  const privateKeyObject = createPrivateKey({
    key: Buffer.from(concatBytes(ed25519Pkcs8Prefix, seed)),
    format: 'der',
    type: 'pkcs8',
  });
  const publicKeyDer = createPublicKey(privateKeyObject).export({
    format: 'der',
    type: 'spki',
  });
  const publicKeyBytes = Uint8Array.from(publicKeyDer).slice(-32);
  const publicKey = bytesToBase64(publicKeyBytes);
  const address = publicKeyToAddress(publicKeyBytes);

  const signMessage = async ({ message }: { message: SignableMessage }) =>
    bytesToBase64(sign(null, messageToBytes(message), privateKeyObject));

  return {
    address,
    publicKey,
    signMessage,
    signTransaction: async (transaction: UnsignedTransaction) => {
      const normalized = normalizeTransaction(transaction);
      const signature = await signMessage({ message: canonicalTransactionJson(normalized) });
      return serializeTransactionForRpc(normalized, signature, publicKey);
    },
    signEncryptedBalanceRequest: async (overrideAddress?: OctraAddress) =>
      signMessage({ message: encryptedBalanceMessage(overrideAddress ?? address) }),
    signRegisterPublicKeyRequest: async (overrideAddress?: OctraAddress) =>
      signMessage({ message: registerPublicKeyMessage(overrideAddress ?? address) }),
    signRegisterPvacPubkeyRequest: async ({ pubkeyBlob, address: overrideAddress }) => {
      const blob = typeof pubkeyBlob === 'string' ? base64ToBytes(pubkeyBlob) : pubkeyBlob;
      const hash = bytesToHex(sha256(blob));
      return signMessage({ message: `register_pvac|${overrideAddress ?? address}|${hash}` });
    },
  };
}

export function mnemonicToAccount(
  mnemonic: string,
  options: MnemonicToAccountOptions = {},
): Account {
  const seed = mnemonicToSeed(mnemonic, options.passphrase);
  const privateKey = deriveHdSeed(seed, options.index ?? 0, options.hdVersion ?? 2);
  return privateKeyToAccount(privateKey);
}

function normalizePrivateKey(value: PrivateKeyInput): Uint8Array {
  const bytes = typeof value === 'string' ? privateKeyStringToBytes(value) : value;
  if (bytes.length !== 32 && bytes.length !== 64) {
    throw new Error('Octra private key must be a 32-byte seed or 64-byte expanded key');
  }
  return bytes.slice(0, 32);
}

function privateKeyStringToBytes(value: string): Uint8Array {
  const normalized = value.trim();
  if (normalized.startsWith('0x')) return hexToBytes(normalized);
  if ((normalized.length === 64 || normalized.length === 128) && /^[0-9a-fA-F]+$/.test(normalized)) {
    return hexToBytes(normalized);
  }
  return base64ToBytes(normalized);
}

function mnemonicToSeed(mnemonic: string, passphrase = ''): Uint8Array {
  return pbkdf2Sync(
    Buffer.from(mnemonic.normalize('NFKD'), 'utf8'),
    Buffer.from(`mnemonic${passphrase}`.normalize('NFKD'), 'utf8'),
    2048,
    64,
    'sha512',
  );
}

function deriveHdSeed(seed: Uint8Array, index: number, hdVersion: 1 | 2): Uint8Array {
  if (!Number.isInteger(index) || index < 0) throw new Error('Mnemonic account index must be a non-negative integer');

  if (hdVersion === 1 && index === 0) return Uint8Array.from(seed.slice(0, 32));

  const hmac = createHmac('sha512', 'Octra seed');
  hmac.update(seed);
  if (index !== 0 || hdVersion === 1) {
    const indexBytes = Buffer.alloc(4);
    indexBytes.writeUInt32LE(index, 0);
    hmac.update(indexBytes);
  }
  return Uint8Array.from(hmac.digest().subarray(0, 32));
}

function messageToBytes(message: SignableMessage): Uint8Array {
  return typeof message === 'string' ? utf8ToBytes(message) : message;
}
