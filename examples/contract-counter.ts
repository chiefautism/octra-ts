import { createPublicClient, createWalletClient, defineAbi, getContract, http, octraPreMainnet } from 'octra-ts';
import { privateKeyToAccount } from 'octra-ts/accounts';

const counterAbi = defineAbi([
  { name: 'count', view: true },
  { name: 'increment', view: false },
] as const);

const transport = http(process.env.OCTRA_RPC_URL ?? octraPreMainnet.rpcUrls.default.http[0]);
const publicClient = createPublicClient({ chain: octraPreMainnet, transport });

const account = process.env.OCTRA_PRIVATE_KEY_HEX || process.env.OCTRA_PRIVATE_KEY_B64
  ? privateKeyToAccount(process.env.OCTRA_PRIVATE_KEY_HEX ?? process.env.OCTRA_PRIVATE_KEY_B64!)
  : undefined;

const walletClient = account
  ? createWalletClient({ account, chain: octraPreMainnet, transport })
  : undefined;

const counter = getContract({
  address: process.env.OCTRA_COUNTER_ADDRESS ?? 'oct...',
  abi: counterAbi,
  client: { public: publicClient, wallet: walletClient },
});

const count = await counter.read.count<number>();
console.log('count', count);

if (walletClient) {
  const submit = await counter.write.increment([], { ou: '1000' });
  console.log('increment submitted', submit);
}
