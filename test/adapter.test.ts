import { describe, expect, test } from 'bun:test';
import { browserWallet, connectBrowserAccount, type OctraBrowserProvider } from '../src/index.js';

const address = 'oct11111111111111111111111111111111111111111111';

describe('browser adapter', () => {
  test('browserWallet routes requests through an Octra provider', async () => {
    const calls: unknown[] = [];
    const provider: OctraBrowserProvider = {
      request: async (request) => {
        calls.push(request);
        return { ok: true };
      },
    };

    const transport = browserWallet(provider);
    await expect(transport.request({ method: 'node_version' })).resolves.toEqual({ ok: true });
    expect(calls).toEqual([{ method: 'node_version', params: [] }]);
  });

  test('connectBrowserAccount creates an account facade around provider signing methods', async () => {
    const calls: Array<{ method: string; params?: readonly unknown[] }> = [];
    const provider: OctraBrowserProvider = {
      request: async (request) => {
        calls.push(request);
        if (request.method === 'octra_requestAccounts') return [{ address, public_key: 'pubkey' }];
        if (request.method === 'octra_signTransaction') return { signature: 'sig', public_key: 'pubkey' };
        return `${request.method}:sig`;
      },
    };

    const account = await connectBrowserAccount(provider);
    expect(account.address).toBe(address);
    expect(account.publicKey).toBe('pubkey');
    await expect(account.signMessage({ message: 'hello' })).resolves.toBe('octra_signMessage:sig');
    await expect(account.signEncryptedBalanceRequest()).resolves.toBe('octra_signEncryptedBalanceRequest:sig');
    await expect(account.signRegisterPublicKeyRequest()).resolves.toBe('octra_signRegisterPublicKeyRequest:sig');
    await expect(account.signRegisterPvacPubkeyRequest({ pubkeyBlob: 'AQID' })).resolves.toBe('octra_signRegisterPvacPubkeyRequest:sig');
    await expect(account.signTransaction({
      from: address,
      to: address,
      amount: '0',
      nonce: 1,
      ou: '1000',
    })).resolves.toEqual({ signature: 'sig', public_key: 'pubkey' });

    expect(calls.map((call) => call.method)).toEqual([
      'octra_requestAccounts',
      'octra_signMessage',
      'octra_signEncryptedBalanceRequest',
      'octra_signRegisterPublicKeyRequest',
      'octra_signRegisterPvacPubkeyRequest',
      'octra_signTransaction',
    ]);
  });
});
