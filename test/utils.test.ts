import { describe, expect, test } from 'bun:test';
import {
  assertAddress,
  base58Encode,
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  canonicalTransactionJson,
  defaultTransferOu,
  formatOctra,
  hexToBytes,
  isAddress,
  normalizeTransaction,
  parseOctra,
  publicKeyToAddress,
  sha256,
  toRawAmount,
} from '../src/index.js';

describe('utils', () => {
  test('sha256 matches a known vector', () => {
    expect(bytesToHex(sha256('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('parses and formats OCT amounts with 6 decimals', () => {
    expect(parseOctra('1.234567')).toBe(1234567n);
    expect(formatOctra(1234567n)).toBe('1.234567');
    expect(formatOctra(1000000n)).toBe('1');
    expect(formatOctra(-1234567n)).toBe('-1.234567');
  });

  test('rejects invalid amount inputs', () => {
    expect(() => parseOctra('1.2345678')).toThrow('more than 6 decimal');
    expect(() => parseOctra('abc')).toThrow('Invalid OCT amount');
    expect(() => toRawAmount(-1n)).toThrow('positive');
    expect(() => toRawAmount(1.2)).toThrow('safe integer');
    expect(() => toRawAmount('1.2')).toThrow('integer');
  });

  test('serializes transactions in the webcli canonical order', () => {
    const json = canonicalTransactionJson({
      from: 'oct11111111111111111111111111111111111111111111',
      to: 'oct22222222222222222222222222222222222222222222',
      amount: '1000000',
      nonce: 7,
      ou: '10000',
      timestamp: 123.5,
      opType: 'standard',
      message: 'hello',
    });
    expect(json).toBe('{"from":"oct11111111111111111111111111111111111111111111","to_":"oct22222222222222222222222222222222222222222222","amount":"1000000","nonce":7,"ou":"10000","timestamp":123.5,"op_type":"standard","message":"hello"}');
  });

  test('normalizes transaction shape and optional fields', () => {
    expect(normalizeTransaction({
      from: 'oct11111111111111111111111111111111111111111111',
      to: 'oct22222222222222222222222222222222222222222222',
      amount: 5n,
      nonce: 1,
      ou: 1000,
      timestamp: 42,
      opType: 'call',
      encryptedData: 'method',
      message: '[]',
    })).toEqual({
      from: 'oct11111111111111111111111111111111111111111111',
      to_: 'oct22222222222222222222222222222222222222222222',
      amount: '5',
      nonce: 1,
      ou: '1000',
      timestamp: 42,
      op_type: 'call',
      encrypted_data: 'method',
      message: '[]',
    });
  });

  test('chooses default transfer OU like webcli', () => {
    expect(defaultTransferOu('999999999')).toBe('10000');
    expect(defaultTransferOu('1000000000')).toBe('30000');
  });

  test('base64 encodes byte arrays', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(bytesToBase64(bytes)).toBe('AQIDBA==');
    expect(Array.from(base64ToBytes('AQIDBA=='))).toEqual(Array.from(bytes));
  });

  test('hex conversion validates input', () => {
    expect(bytesToHex(hexToBytes('0x0a0b'))).toBe('0a0b');
    expect(() => hexToBytes('abc')).toThrow('even length');
    expect(() => hexToBytes('zz')).toThrow('Invalid hex');
  });

  test('base58 and Octra address helpers', () => {
    expect(base58Encode(new Uint8Array([0, 0, 1]))).toBe('112');
    const address = publicKeyToAddress(new Uint8Array(32).fill(7));
    expect(address).toStartWith('oct');
    expect(address).toHaveLength(47);
    expect(isAddress(address)).toBe(true);
    expect(isAddress('oct00000000000000000000000000000000000000000000')).toBe(false);
    expect(() => assertAddress('not-octra')).toThrow('Invalid Octra address');
  });
});
