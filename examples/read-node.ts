import { createPublicClient, fallback, http, octraPreMainnet } from 'octra-ts';

const client = createPublicClient({
  chain: octraPreMainnet,
  transport: fallback([
    http('https://octra.network/rpc', { batch: true, timeout: 15_000 }),
    http('http://46.101.86.250:8080/rpc', { timeout: 15_000 }),
  ]),
});

const [version, status, stats] = await Promise.all([
  client.nodeVersion(),
  client.nodeStatus(),
  client.nodeStats(),
]);

console.log({ version, status, stats });
