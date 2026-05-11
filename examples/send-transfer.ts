import { createWalletClient, http, octraPreMainnet, parseOctra } from 'octra-ts';
import { privateKeyToAccount } from 'octra-ts/accounts';

const privateKey = process.env.OCTRA_PRIVATE_KEY_HEX ?? process.env.OCTRA_PRIVATE_KEY_B64;
const to = process.env.OCTRA_TO_ADDRESS;

if (!privateKey) throw new Error('Set OCTRA_PRIVATE_KEY_HEX or OCTRA_PRIVATE_KEY_B64');
if (!to?.startsWith('oct')) throw new Error('Set OCTRA_TO_ADDRESS');

const account = privateKeyToAccount(privateKey);
const wallet = createWalletClient({
  account,
  chain: octraPreMainnet,
  transport: http(process.env.OCTRA_RPC_URL ?? octraPreMainnet.rpcUrls.default.http[0]),
});

const prepared = await wallet.prepareTransfer({
  to,
  amount: parseOctra(process.env.OCTRA_AMOUNT ?? '0.001'),
});

console.log('prepared', prepared);

const submit = await wallet.sendTransferAndWait({
  to,
  amount: prepared.amount,
  nonce: prepared.nonce,
  ou: prepared.ou,
  wait: { timeout: 60_000, pollingInterval: 2_000 },
});

console.log('submitted', submit);
