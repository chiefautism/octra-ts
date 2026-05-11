import { describe, expect, test } from 'bun:test';
import { defineAbi, generateContractTypes, getContract, parseContractAbi } from '../src/index.js';
import type { Json, SubmitResult } from '../src/index.js';

const address = 'oct22222222222222222222222222222222222222222222';
const caller = 'oct11111111111111111111111111111111111111111111';
const abi = [
  { name: 'name', view: true },
  { name: 'transfer', view: false },
] as const;

describe('contract helper', () => {
  test('routes read methods through readContract and unwraps result', async () => {
    const calls: unknown[] = [];
    const contract = getContract({
      address,
      abi,
      client: {
        readContract: async (parameters) => {
          calls.push(parameters);
          return { result: 'Octra Token' };
        },
      },
    });

    await expect(contract.read.name([], { caller })).resolves.toBe('Octra Token');
    expect(calls).toEqual([{ address, method: 'name', params: [], caller }]);
  });

  test('routes write methods through wallet writeContract', async () => {
    const calls: unknown[] = [];
    const result: SubmitResult = {
      nonce: 7,
      ou_cost: '1000',
      status: 'accepted',
      tx_hash: 'a'.repeat(64),
    };
    const contract = getContract({
      address,
      abi,
      client: {
        wallet: {
          writeContract: async (parameters) => {
            calls.push(parameters);
            return result;
          },
        },
      },
    });

    await expect(contract.write.transfer([caller, '10' as Json], { amount: '0', nonce: 7 })).resolves.toBe(result);
    expect(calls).toEqual([{
      address,
      amount: '0',
      method: 'transfer',
      nonce: 7,
      params: [caller, '10'],
    }]);
  });

  test('throws lazily when the required client side is missing', async () => {
    const contract = getContract({
      address,
      abi,
      client: {
        readContract: async () => ({ result: true }),
      },
    });

    await expect(contract.write.transfer()).rejects.toThrow('wallet client');
  });

  test('defines and parses ABI arrays from compiler-style shapes', () => {
    const defined = defineAbi(abi);
    expect(defined[0].name).toBe('name');
    expect(parseContractAbi(JSON.stringify({ methods: abi }))).toEqual(abi);
    expect(parseContractAbi({ abi })).toEqual(abi);
    expect(() => parseContractAbi({ nope: [] })).toThrow('Contract ABI');
  });

  test('generates TypeScript contract helpers from ABI', () => {
    const source = generateContractTypes({
      name: 'counter',
      abi,
      address,
    });

    expect(source).toContain('export const CounterAbi');
    expect(source).toContain('export const CounterAddress');
    expect(source).toContain('getCounterContract');
    expect(source).toContain('"transfer"');
  });
});
