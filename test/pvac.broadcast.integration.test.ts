import { describe, expect, test } from 'bun:test';
import {
  createPublicClient,
  createWalletClient,
  http,
  octraPreMainnet,
} from '../src/index.js';
import { privateKeyToAccount } from '../src/accounts/index.js';
import { createPvacWasmBackend } from '../src/pvac/index.js';
import { bytesToBase64 } from '../src/utils/bytes.js';

const privateKey = process.env.OCTRA_PRIVATE_KEY_B64
  ?? process.env.OCTRA_PRIVATE_KEY_HEX;

const runPvacBroadcast = process.env.OCTRA_PVAC_BROADCAST === '1' && privateKey;
const maybePvacBroadcast = runPvacBroadcast ? describe : describe.skip;
const rpcUrl = process.env.OCTRA_RPC_URL ?? 'https://octra.network/rpc';

maybePvacBroadcast('PVAC/FHE Octra RPC integration', () => {
  test('registers PVAC material, decrypts encrypted balance, and round-trips encrypt/decrypt transactions', async () => {
    const account = privateKeyToAccount(privateKey!);
    const pvac = await createPvacWasmBackend({ seed: privateKey! });
    const publicClient = createPublicClient({
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 30_000, retryCount: 1, retryDelay: 250 }),
    });
    const wallet = createWalletClient({
      account,
      pvac,
      chain: octraPreMainnet,
      transport: http(rpcUrl, { timeout: 30_000, retryCount: 1, retryDelay: 250 }),
    });

    try {
      await wallet.ensurePublicKeyRegistered();
      const registration = await wallet.ensurePvacPubkeyRegisteredFromBackend();
      expect(registration.address).toBe(account.address);

      const remote = await publicClient.getPvacPubkey({ address: account.address });
      expect(remote.pvac_pubkey).toBe(bytesToBase64(await pvac.serializePubkey()));
      expect(remote.pubkey_size).toBeGreaterThan(1_000_000);

      const beforeEncrypted = await wallet.getEncryptedBalanceForAccount();
      expect(beforeEncrypted.cipher).toStartWith('hfhe_v1|');
      const beforePrivateRaw = await pvac.decryptCipher(beforeEncrypted.cipher);

      const amount = BigInt(process.env.OCTRA_PVAC_AMOUNT_RAW ?? '1');
      const publicBalance = await publicClient.getBalance({ address: account.address });
      expect(BigInt(publicBalance.balance_raw)).toBeGreaterThanOrEqual(amount);

      const encrypted = await wallet.encryptBalanceAndWait({
        amount,
        wait: {
          pollingInterval: 1_000,
          timeout: 90_000,
        },
      });
      expect(encrypted.tx_hash).toHaveLength(64);
      expect(encrypted.transaction.status).toBe('confirmed');

      const afterEncryptCipher = await wallet.getEncryptedBalanceForAccount();
      const afterEncryptPrivateRaw = await pvac.decryptCipher(afterEncryptCipher.cipher);
      expect(afterEncryptPrivateRaw).toBeGreaterThanOrEqual(beforePrivateRaw + amount);

      const decrypted = await wallet.decryptBalanceAndWait({
        amount,
        currentCipher: afterEncryptCipher.cipher,
        currentBalance: afterEncryptPrivateRaw,
        wait: {
          pollingInterval: 1_000,
          timeout: 90_000,
        },
      });
      expect(decrypted.tx_hash).toHaveLength(64);
      expect(decrypted.transaction.status).toBe('confirmed');

      const afterDecryptCipher = await wallet.getEncryptedBalanceForAccount();
      const afterDecryptPrivateRaw = await pvac.decryptCipher(afterDecryptCipher.cipher);
      expect(afterDecryptPrivateRaw).toBeLessThanOrEqual(afterEncryptPrivateRaw - amount);
    } finally {
      pvac.free();
    }
  }, 1_800_000);
});
