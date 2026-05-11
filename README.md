# octra-ts 

warning: experimental slop

Viem-style TypeScript client for Octra JSON-RPC 2.0.

It is small on purpose: typed RPC methods, composable transports, amount/address helpers, transaction canonicalization, and a Node Ed25519 account helper compatible with the Octra webcli signing shape.

## Install

```sh
npm install octra-ts
```

This folder is a local package scaffold, so during development you can also import from `./src`.

## CLI

The package ships a small `octra` CLI for quick account, RPC, fee, transaction, and PVAC checks.

```sh
octra --help
octra status --rpc https://octra.network/rpc
octra balance oct...
octra account --key $OCTRA_PRIVATE_KEY_HEX
octra fee deploy
octra tx 50cc98607a2025b4412a05c7e10261d60514ca7e30496acee500eae20eb87522
octra rpc node_version
octra pvac info --key $OCTRA_PRIVATE_KEY_HEX --threads auto
```

Broadcasting is guarded: `octra send <to> --amount <oct|raw> --key <hex|base64>` requires `--yes`, and `--wait` can be added to wait for confirmation.

Contract deploy/verify flows are built in:

```sh
octra contract compile contracts/counter.aml
octra contract deploy contracts/counter.aml \
  --key $OCTRA_PRIVATE_KEY_HEX \
  --yes \
  --wait \
  --verify \
  --save-abi

octra contract verify oct... contracts/counter.aml
octra contract read oct... get
octra contract write oct... inc --key $OCTRA_PRIVATE_KEY_HEX --yes --wait
octra contract receipt 50cc98607a2025b4412a05c7e10261d60514ca7e30496acee500eae20eb87522
```

For multi-file AML projects, pass dependencies with `--file dep.aml` and set `--main main.aml` when the first positional file is not the main file.

## Public client

```ts
import { createPublicClient, http, octraPreMainnet, parseOctra } from 'octra-ts'

const client = createPublicClient({
  chain: octraPreMainnet,
  transport: http(),
})

const status = await client.nodeStatus()
const balance = await client.getBalance({
  address: 'oct3SSKjCGK8pVxPHH1Y6LZEVqm94rZn3StXHt31AD1UUVN',
})
```

Raw RPC is available too:

```ts
const result = await client.request({
  method: 'octra_balance',
  params: ['oct3SSKjCGK8pVxPHH1Y6LZEVqm94rZn3StXHt31AD1UUVN'],
})
```

Useful higher-level actions:

```ts
const prepared = await client.prepareTransaction({
  from: 'oct...',
  to: 'oct...',
  amount: parseOctra('0.1'),
})

const fee = await client.estimateFee({ opType: 'call', speed: 'fast' })
const tx = await client.waitForTransaction({ hash: '...', timeout: 60_000 })

const unwatch = client.watchEpoch({
  onChange: (epoch) => console.log('epoch', epoch.epoch_id),
})
```

## Wallet client

```ts
import { createWalletClient, http, parseOctra } from 'octra-ts'
import { mnemonicToAccount, privateKeyToAccount } from 'octra-ts/accounts'

const account = privateKeyToAccount(process.env.OCTRA_PRIVATE_KEY_B64!)
// or:
const accountFromMnemonic = mnemonicToAccount(process.env.OCTRA_MNEMONIC!)

const wallet = createWalletClient({
  account,
  transport: http('http://46.101.86.250:8080'),
})

const receipt = await wallet.sendTransfer({
  to: 'oct3SSKjCGK8pVxPHH1Y6LZEVqm94rZn3StXHt31AD1UUVN',
  amount: parseOctra('1'),
})
```

`sendTransfer` resolves `pending_nonce`, signs the same canonical transaction JSON as webcli, and submits via `octra_submit`.

There are convenience variants for full flows:

```ts
await wallet.ensurePublicKeyRegistered()

const result = await wallet.sendTransferAndWait({
  to: 'oct...',
  amount: parseOctra('0.01'),
  wait: { timeout: 60_000 },
})
```

## Contract examples

```ts
import { getContract } from 'octra-ts'

const counter = getContract({
  address: 'oct...',
  abi: [
    { name: 'count', view: true },
    { name: 'increment', view: false },
  ] as const,
  client: { public: client, wallet },
})

const count = await counter.read.count<number>()
const receipt = await counter.write.increment([])
```

Lower-level contract actions are still available:

```ts
const compiled = await client.compileAml({ source })
const deployed = await wallet.deployContract({
  bytecode: compiled.bytecode,
  params: [],
})
```

ABI helpers are available for AML compiler output:

```ts
import { defineAbi, generateContractTypes, parseContractAbi } from 'octra-ts/contract'

const abi = parseContractAbi(compiled.abi)
const source = generateContractTypes({ name: 'Counter', abi, address: deployed.contract_address })
```

## Transports and extensions

```ts
import { createPublicClient, fallback, http } from 'octra-ts'

const client = createPublicClient({
  transport: fallback([
    http('https://octra.network/rpc', { batch: true }),
    http('http://46.101.86.250:8080/rpc'),
  ]),
}).extend((client) => ({
  health: async () => ({
    status: await client.nodeStatus(),
    version: await client.nodeVersion(),
  }),
}))
```

## Browser wallet adapter

```ts
import { browserWallet, connectBrowserAccount, createWalletClient } from 'octra-ts'

const account = await connectBrowserAccount()
const wallet = createWalletClient({
  account,
  transport: browserWallet(),
})
```

## PVAC / FHE WASM backend

`octra-ts/pvac` includes a vendored WASM backend based on `@0xio/pvac` so encrypted-balance payloads are generated locally instead of mocked.

```ts
import { createWalletClient, http, parseOctra } from 'octra-ts'
import { privateKeyToAccount } from 'octra-ts/accounts'
import { createPvacWasmBackend } from 'octra-ts/pvac'

const seed = process.env.OCTRA_PRIVATE_KEY_HEX!
const account = privateKeyToAccount(seed)
const pvac = await createPvacWasmBackend({
  seed,
  preWarm: true,
  threads: 'auto',
})

const wallet = createWalletClient({
  account,
  pvac,
  transport: http('https://octra.network/rpc'),
})

await wallet.ensurePvacPubkeyRegisteredFromBackend()

await wallet.encryptBalance({
  amount: parseOctra('0.1'),
})

await wallet.decryptBalance({
  amount: parseOctra('0.05'),
  onProgress: (phase, pct) => console.log(phase, pct),
})
```

`threads: 'auto'` detects the available WASM worker capacity from the runtime and initializes that many Rayon workers, or uses `OCTRA_PVAC_THREADS` when set. Use `threads: false` for single-thread fallback.

PVAC is browser/WASM-oriented and can be CPU-heavy. `decryptBalance` generates a range proof and may take tens of seconds. The SDK keeps this behind a pluggable backend so Node/server users can swap in a native implementation later.

## API map

See [`docs/api.md`](docs/api.md) for the current API surface and [`examples/`](examples/) for runnable snippets.

## Testing

```sh
bun run check
bun run pack:smoke
OCTRA_LIVE=1 OCTRA_PRIVATE_KEY_HEX=... bun test test/live.integration.test.ts
OCTRA_BROADCAST=1 OCTRA_PRIVATE_KEY_HEX=... bun test test/broadcast.integration.test.ts
```

Broadcast tests submit minimal testnet transfers and should only be run with disposable funded keys.
They also compile, deploy, call, and read a tiny counter contract.

## Notes

- Amounts on the wire are raw Z integers. Use `parseOctra` and `formatOctra` for 6-decimal OCT conversions.
- `http(..., { batch: true })` batches concurrent requests into JSON-RPC batch payloads.
- `fallback([...])` retries the next transport after network/HTTP failures, while JSON-RPC errors stay terminal by default.
- Transaction signing uses the webcli field order: `from`, `to_`, `amount`, `nonce`, `ou`, `timestamp`, `op_type`, then optional `encrypted_data` and `message`.
- The root package does not export the account helper; import it from `octra-ts/accounts` so read-only/browser clients stay clean.
- PVAC source is vendored from `@0xio/pvac` under the MIT license; see [`docs/third-party-notices.md`](docs/third-party-notices.md).
