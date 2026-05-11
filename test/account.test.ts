import { describe, expect, test } from 'bun:test';
import { createHmac, createPublicKey, pbkdf2Sync, verify } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mnemonicToAccount, privateKeyToAccount } from '../src/accounts/index.js';
import { base64ToBytes, bytesToBase64, bytesToHex, canonicalTransactionJson, hexToBytes, sha256 } from '../src/index.js';

const ed25519SpkiPrefix = hexToBytes('302a300506032b6570032100');
const publicMnemonic = 'test test test test test test test test test test test junk';

describe('node account', () => {
  test('derives an Octra address and signs transactions', async () => {
    const seed = new Uint8Array(32);
    seed[31] = 1;
    const account = privateKeyToAccount(bytesToBase64(seed));
    const signed = await account.signTransaction({
      from: account.address,
      to: account.address,
      amount: '0',
      nonce: 1,
      ou: '1000',
      timestamp: 123,
      opType: 'standard',
    });

    expect(account.address.startsWith('oct')).toBe(true);
    expect(account.address.length).toBe(47);
    expect(account.publicKey.length).toBe(44);
    expect(signed.signature.length).toBe(88);
    expect(signed.public_key).toBe(account.publicKey);
    expect(signed.to_).toBe(account.address);
    expect(signed.op_type).toBe('standard');
  });

  test('accepts 64-byte expanded private keys by using their first 32-byte seed', () => {
    const expanded = new Uint8Array(64).fill(8);
    const seed = expanded.slice(0, 32);
    expect(privateKeyToAccount(expanded).address).toBe(privateKeyToAccount(seed).address);
  });

  test('accepts bare and 0x-prefixed hex private keys', () => {
    const hex = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
    expect(privateKeyToAccount(hex).address).toBe(privateKeyToAccount(`0x${hex}`).address);
    expect(privateKeyToAccount(hex).address).toBe(privateKeyToAccount(hexToBytes(hex)).address);
  });

  test('derives deterministic accounts from mnemonic options', () => {
    const first = mnemonicToAccount(publicMnemonic);
    expect(mnemonicToAccount(publicMnemonic).address).toBe(first.address);
    expect(mnemonicToAccount(publicMnemonic, { index: 1 }).address).not.toBe(first.address);
    expect(mnemonicToAccount(publicMnemonic, { hdVersion: 1 }).address).not.toBe(first.address);
    expect(mnemonicToAccount(publicMnemonic, { passphrase: 'octra' }).address).not.toBe(first.address);
  });

  test('uses webcli-compatible little-endian HD child indexes', () => {
    const seed = pbkdf2Sync(publicMnemonic, 'mnemonic', 2048, 64, 'sha512');
    const data = Buffer.alloc(68);
    seed.copy(data, 0);
    data.writeUInt32LE(1, 64);
    const childSeed = createHmac('sha512', 'Octra seed').update(data).digest().subarray(0, 32);

    expect(mnemonicToAccount(publicMnemonic, { index: 1 }).address)
      .toBe(privateKeyToAccount(childSeed).address);
  });

  test('rejects invalid mnemonic account indexes', () => {
    expect(() => mnemonicToAccount('test test test test test test test test test test test junk', { index: -1 })).toThrow('non-negative integer');
  });

  test('signs RPC helper proof messages', async () => {
    const account = privateKeyToAccount(new Uint8Array(32).fill(9));
    expect(await account.signEncryptedBalanceRequest()).toHaveLength(88);
    expect(await account.signRegisterPublicKeyRequest()).toHaveLength(88);
    expect(await account.signRegisterPvacPubkeyRequest({ pubkeyBlob: bytesToBase64(new Uint8Array([1, 2])) })).toHaveLength(88);
  });

  test('produces Ed25519 signatures verifiable by Node crypto', async () => {
    const account = privateKeyToAccount(new Uint8Array(32).fill(3));
    const message = 'hello octra';
    const signature = base64ToBytes(await account.signMessage({ message }));
    const publicKey = createPublicKey({
      key: Buffer.from(new Uint8Array([...ed25519SpkiPrefix, ...base64ToBytes(account.publicKey)])),
      format: 'der',
      type: 'spki',
    });

    expect(verify(null, Buffer.from(message), publicKey, Buffer.from(signature))).toBe(true);
  });

  test('signs the canonical transaction JSON bytes', async () => {
    const account = privateKeyToAccount(new Uint8Array(32).fill(4));
    const tx = {
      from: account.address,
      to: account.address,
      amount: '123',
      nonce: 2,
      ou: '1000',
      timestamp: 555,
      opType: 'standard',
    } as const;
    const signed = await account.signTransaction(tx);
    const publicKey = createPublicKey({
      key: Buffer.from(new Uint8Array([...ed25519SpkiPrefix, ...base64ToBytes(account.publicKey)])),
      format: 'der',
      type: 'spki',
    });

    expect(verify(
      null,
      Buffer.from(canonicalTransactionJson(signed)),
      publicKey,
      Buffer.from(base64ToBytes(signed.signature)),
    )).toBe(true);
  });

  test('pvac registration proof signs the sha256 of the decoded blob', async () => {
    const account = privateKeyToAccount(new Uint8Array(32).fill(5));
    const blob = bytesToBase64(new Uint8Array([7, 8, 9]));
    const expectedMessage = `register_pvac|${account.address}|${bytesToHex(sha256(base64ToBytes(blob)))}`;
    const expected = await account.signMessage({ message: expectedMessage });
    expect(await account.signRegisterPvacPubkeyRequest({ pubkeyBlob: blob })).toBe(expected);
  });

  test('rejects invalid private key lengths', () => {
    expect(() => privateKeyToAccount(new Uint8Array(31))).toThrow('32-byte seed');
  });
});
