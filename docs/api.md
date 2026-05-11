# API Surface

## Clients

| API | Description |
| --- | --- |
| `createClient` | Low-level typed JSON-RPC client. |
| `createPublicClient` | Read, compile, search, staging, epoch, and contract read actions. |
| `createWalletClient` | Public actions plus account signing and submit actions. |
| `client.extend` | Attach project-local actions without losing built-ins. |

## Transports

| API | Description |
| --- | --- |
| `http` | JSON-RPC HTTP transport with timeout, retry, headers, and batching. |
| `custom` | Adapter for any `{ request }` provider. |
| `fallback` | Tries multiple transports for network/HTTP failures. |
| `browserWallet` | Uses an injected Octra browser provider as a transport. |

## Public Actions

| API | Description |
| --- | --- |
| `nodeVersion`, `nodeStatus`, `nodeStats`, `nodeMetrics` | Node metadata and health. |
| `getBalance`, `getAccount`, `getNonce`, `getPublicKey` | Account reads. |
| `getTransaction`, `getRecentTransactions`, `getTransactions*` | Transaction reads. |
| `waitForTransaction` | Poll until a transaction reaches a terminal status. |
| `watchEpoch`, `watchPendingTransactions` | Polling watchers that return an `unwatch` function. |
| `estimateFee`, `prepareTransaction` | Fee and unsigned transaction preparation. |
| `readContract`, `simulateContract` | Contract view calls. |
| `compileAssembly`, `compileAml`, `compileAmlMulti` | Compiler RPC helpers. |
| `getPvacPubkey`, `getEncryptedCipher`, `getEncryptedBalance` | FHE/encryption reads. |
| `getViewPubkey`, `getStealthOutputs` | Stealth reads. |

## Wallet Actions

| API | Description |
| --- | --- |
| `signTransaction`, `submitTransaction`, `submitBatch` | Low-level wallet actions. |
| `sendTransaction`, `sendTransactionAndWait` | Sign and submit arbitrary Octra transactions. |
| `prepareTransfer`, `sendTransfer`, `sendTransferAndWait` | Standard transfer flow. |
| `deployContract`, `deployContractAndWait` | Deploy bytecode and wait for confirmation. |
| `writeContract`, `writeContractAndWait` | Contract call transaction flow. |
| `registerPublicKey`, `ensurePublicKeyRegistered` | Ed25519 public key registration. |
| `registerPvacPubkey`, `ensurePvacPubkeyRegistered` | FHE public key registration. |
| `registerPvacPubkeyFromBackend`, `ensurePvacPubkeyRegisteredFromBackend` | FHE key registration from a configured PVAC backend. |
| `getEncryptedBalanceForAccount` | Signed encrypted balance read. |
| `encryptBalance`, `encryptBalanceAndWait` | Build PVAC encrypt payload, sign, submit, and optionally wait. |
| `decryptBalance`, `decryptBalanceAndWait` | Fetch/decrypt encrypted balance, build range-proof payload, sign, submit, and optionally wait. |
| `privateTransfer`, `sendPrivateTransfer`, `sendPrivateTransferAndWait` | Private/stealth transfer helpers. |

## PVAC

Import from `octra-ts/pvac`.

| API | Description |
| --- | --- |
| `createPvacWasmBackend` | Initialize the vendored WASM backend from a 32-byte wallet seed. Defaults to auto-detected Rayon threads. |
| `createPvacWasmBackendFromContext` | Wrap an already-created `PvacContext` as an SDK backend. |
| `getPvacRegistrationMaterial` | Serialize the PVAC public key and AES KAT for `octra_registerPvacPubkey`. |
| `buildEncryptPayload`, `buildDecryptPayload` | Low-level encrypted-data builders for custom flows. |
| `PvacContext`, `PrivateTransfer`, `StealthAddress` | Lower-level vendored PVAC primitives without exposing the raw WASM module. |
| `pvacStealth` | Thin wrapper around stealth key/output/scan helpers. |

## Accounts And Contracts

| API | Description |
| --- | --- |
| `privateKeyToAccount` | Node Ed25519 account from base64, hex, or bytes. |
| `mnemonicToAccount` | webcli-compatible mnemonic derivation. |
| `getContract` | Viem-like typed contract facade. |
| `defineAbi`, `parseContractAbi`, `generateContractTypes` | ABI typing and codegen helpers. |
