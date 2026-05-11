import { createWalletClient, custom } from 'octra-ts';
import { mnemonicToAccount, privateKeyToAccount } from 'octra-ts/accounts';

const account = process.env.OCTRA_MNEMONIC
  ? mnemonicToAccount(process.env.OCTRA_MNEMONIC)
  : privateKeyToAccount(process.env.OCTRA_PRIVATE_KEY_HEX ?? process.env.OCTRA_PRIVATE_KEY_B64 ?? '');

const wallet = createWalletClient({
  account,
  transport: custom({ request: async () => ({}) }),
});

const signed = await wallet.signTransaction({
  transaction: {
    from: account.address,
    to: account.address,
    amount: '0',
    nonce: 1,
    ou: '1000',
    timestamp: 1_700_000_000,
  },
});

console.log({
  address: account.address,
  publicKey: account.publicKey,
  signed,
});
