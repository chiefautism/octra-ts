import type { Account, Base64, OctraAddress, SignableMessage, SignedTransaction, Transport, UnsignedTransaction } from '../types.js';

export type OctraBrowserProvider = {
  request: (request: { method: string; params?: readonly unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type BrowserAccount = Account & {
  provider: OctraBrowserProvider;
};

type BrowserAccountResponse = {
  address: OctraAddress;
  publicKey?: Base64;
  public_key?: Base64;
};

declare global {
  interface Window {
    octra?: OctraBrowserProvider;
  }
}

export function getBrowserProvider(provider?: OctraBrowserProvider): OctraBrowserProvider {
  const resolved = provider ?? globalThis.window?.octra;
  if (!resolved) throw new Error('No Octra browser provider found');
  return resolved;
}

export function browserWallet(provider?: OctraBrowserProvider): Transport {
  const resolved = getBrowserProvider(provider);
  return {
    key: 'browserWallet',
    name: 'Octra Browser Wallet',
    request: async <result = unknown>(
      request: { method: string; params?: readonly unknown[] },
    ): Promise<result> => {
      return await resolved.request({
        method: request.method,
        params: request.params ?? [],
      }) as result;
    },
  };
}

export async function connectBrowserAccount(provider?: OctraBrowserProvider): Promise<BrowserAccount> {
  const resolved = getBrowserProvider(provider);
  const account = await resolved.request({ method: 'octra_requestAccounts', params: [] }) as BrowserAccountResponse | BrowserAccountResponse[];
  const selected = Array.isArray(account) ? account[0] : account;
  if (!selected?.address) throw new Error('Octra browser provider did not return an account');
  const publicKey = selected.publicKey ?? selected.public_key ?? '';

  return {
    address: selected.address,
    publicKey,
    provider: resolved,
    signMessage: async ({ message }: { message: SignableMessage }) =>
      resolved.request({
        method: 'octra_signMessage',
        params: [messageToProviderValue(message), selected.address],
      }) as Promise<Base64>,
    signTransaction: async (transaction: UnsignedTransaction) =>
      resolved.request({
        method: 'octra_signTransaction',
        params: [transaction, selected.address],
      }) as Promise<SignedTransaction>,
    signEncryptedBalanceRequest: async (address?: OctraAddress) =>
      resolved.request({
        method: 'octra_signEncryptedBalanceRequest',
        params: [address ?? selected.address],
      }) as Promise<Base64>,
    signRegisterPublicKeyRequest: async (address?: OctraAddress) =>
      resolved.request({
        method: 'octra_signRegisterPublicKeyRequest',
        params: [address ?? selected.address],
      }) as Promise<Base64>,
    signRegisterPvacPubkeyRequest: async (parameters) =>
      resolved.request({
        method: 'octra_signRegisterPvacPubkeyRequest',
        params: [parameters.pubkeyBlob, parameters.address ?? selected.address],
      }) as Promise<Base64>,
  };
}

function messageToProviderValue(message: SignableMessage): string | number[] {
  return typeof message === 'string' ? message : Array.from(message);
}
