import type {
  Account,
  ContractAddress,
  ContractCallResult,
  Json,
  OctraAddress,
  SubmitResult,
} from '../types.js';

type AbiFunction = {
  readonly inputs?: readonly unknown[];
  readonly name: string;
  readonly outputs?: readonly unknown[];
  readonly stateMutability?: string;
  readonly type?: string;
  readonly view?: boolean;
};

export type OctraAbi = readonly AbiFunction[];

type AbiMethodName<abi extends OctraAbi> = abi[number]['name'] & string;

export type ContractReadOptions = {
  caller?: OctraAddress;
};

export type ContractWriteOptions = {
  account?: Account;
  amount?: bigint | number | string;
  nonce?: number;
  ou?: bigint | number | string;
};

export type PublicContractClient = {
  readContract: <result = Json>(parameters: {
    address: ContractAddress;
    method: string;
    params?: Json[];
    caller?: OctraAddress;
  }) => Promise<ContractCallResult<result>>;
};

export type WalletContractClient = {
  writeContract: (parameters: {
    account?: Account;
    address: ContractAddress;
    method: string;
    params?: Json[];
    amount?: bigint | number | string;
    nonce?: number;
    ou?: bigint | number | string;
  }) => Promise<SubmitResult>;
};

export type ContractClient =
  | PublicContractClient
  | WalletContractClient
  | {
    public?: PublicContractClient;
    wallet?: WalletContractClient;
  };

export type ContractReadActions<abi extends OctraAbi> = {
  [method in AbiMethodName<abi>]: <result = Json>(
    params?: Json[],
    options?: ContractReadOptions,
  ) => Promise<result>;
};

export type ContractWriteActions<abi extends OctraAbi> = {
  [method in AbiMethodName<abi>]: (
    params?: Json[],
    options?: ContractWriteOptions,
  ) => Promise<SubmitResult>;
};

export type ContractInstance<abi extends OctraAbi> = {
  address: ContractAddress;
  abi: abi;
  read: ContractReadActions<abi>;
  write: ContractWriteActions<abi>;
};

export type GetContractParameters<abi extends OctraAbi> = {
  address: ContractAddress;
  abi: abi;
  client: ContractClient;
};

export function getContract<const abi extends OctraAbi>(
  parameters: GetContractParameters<abi>,
): ContractInstance<abi> {
  const publicClient = resolvePublicClient(parameters.client);
  const walletClient = resolveWalletClient(parameters.client);

  return {
    address: parameters.address,
    abi: parameters.abi,
    read: createReadProxy(parameters.address, publicClient),
    write: createWriteProxy(parameters.address, walletClient),
  };
}

export function defineAbi<const abi extends OctraAbi>(abi: abi): abi {
  return abi;
}

export function parseContractAbi(value: string | unknown): OctraAbi {
  const parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value;
  if (Array.isArray(parsed)) return normalizeAbiArray(parsed);
  if (parsed && typeof parsed === 'object') {
    const object = parsed as { abi?: unknown; methods?: unknown; functions?: unknown };
    if (Array.isArray(object.abi)) return normalizeAbiArray(object.abi);
    if (Array.isArray(object.methods)) return normalizeAbiArray(object.methods);
    if (Array.isArray(object.functions)) return normalizeAbiArray(object.functions);
  }
  throw new Error('Contract ABI must be an array or an object with abi/methods/functions');
}

export type GenerateContractTypesParameters = {
  abi: OctraAbi | string;
  name: string;
  address?: ContractAddress;
};

export function generateContractTypes(parameters: GenerateContractTypesParameters): string {
  const abi = typeof parameters.abi === 'string'
    ? parseContractAbi(parameters.abi)
    : parameters.abi;
  const name = toIdentifier(parameters.name);
  const exportName = `${name}Abi`;
  const lines = [
    "import { defineAbi, getContract, type ContractClient } from 'octra-ts/contract'",
    '',
    `export const ${exportName} = defineAbi(${JSON.stringify(abi, null, 2)} as const)`,
    '',
    `export type ${name}Abi = typeof ${exportName}`,
  ];
  if (parameters.address) {
    lines.push(
      '',
      `export const ${name}Address = ${JSON.stringify(parameters.address)} as const`,
      '',
      `export const get${name}Contract = (client: ContractClient) =>`,
      `  getContract({ address: ${name}Address, abi: ${exportName}, client })`,
    );
  }
  return `${lines.join('\n')}\n`;
}

function createReadProxy<abi extends OctraAbi>(
  address: ContractAddress,
  client?: PublicContractClient,
): ContractReadActions<abi> {
  return new Proxy({}, {
    get: (_target, property) => {
      if (typeof property !== 'string' || property === 'then') return undefined;
      return async (params: Json[] = [], options: ContractReadOptions = {}) => {
        if (!client) throw new Error('A public client is required to read contract methods');
        const value = await client.readContract({
          address,
          method: property,
          params,
          caller: options.caller,
        });
        return value.result;
      };
    },
  }) as ContractReadActions<abi>;
}

function createWriteProxy<abi extends OctraAbi>(
  address: ContractAddress,
  client?: WalletContractClient,
): ContractWriteActions<abi> {
  return new Proxy({}, {
    get: (_target, property) => {
      if (typeof property !== 'string' || property === 'then') return undefined;
      return async (params: Json[] = [], options: ContractWriteOptions = {}) => {
        if (!client) throw new Error('A wallet client is required to write contract methods');
        return client.writeContract({
          ...options,
          address,
          method: property,
          params,
        });
      };
    },
  }) as ContractWriteActions<abi>;
}

function resolvePublicClient(client: ContractClient): PublicContractClient | undefined {
  if (isPublicContractClient(client)) return client;
  if (isClientPair(client) && isPublicContractClient(client.public)) return client.public;
  return undefined;
}

function resolveWalletClient(client: ContractClient): WalletContractClient | undefined {
  if (isWalletContractClient(client)) return client;
  if (isClientPair(client) && isWalletContractClient(client.wallet)) return client.wallet;
  return undefined;
}

function isClientPair(value: unknown): value is { public?: unknown; wallet?: unknown } {
  return typeof value === 'object' && value !== null;
}

function isPublicContractClient(value: unknown): value is PublicContractClient {
  return typeof value === 'object'
    && value !== null
    && 'readContract' in value
    && typeof value.readContract === 'function';
}

function isWalletContractClient(value: unknown): value is WalletContractClient {
  return typeof value === 'object'
    && value !== null
    && 'writeContract' in value
    && typeof value.writeContract === 'function';
}

function normalizeAbiArray(value: unknown[]): OctraAbi {
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Contract ABI entries must be objects');
    const entry = item as { name?: unknown; view?: unknown; stateMutability?: unknown; type?: unknown; inputs?: unknown; outputs?: unknown };
    if (typeof entry.name !== 'string' || entry.name.length === 0) throw new Error('Contract ABI entries must include a name');
    return {
      name: entry.name,
      ...(Array.isArray(entry.inputs) ? { inputs: entry.inputs } : {}),
      ...(Array.isArray(entry.outputs) ? { outputs: entry.outputs } : {}),
      ...(typeof entry.stateMutability === 'string' ? { stateMutability: entry.stateMutability } : {}),
      ...(typeof entry.type === 'string' ? { type: entry.type } : {}),
      ...(typeof entry.view === 'boolean' ? { view: entry.view } : {}),
    };
  });
}

function toIdentifier(value: string): string {
  const words = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const identifier = words
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join('');
  if (!identifier) throw new Error('Contract type name must contain at least one identifier character');
  return /^[0-9]/.test(identifier) ? `Contract${identifier}` : identifier;
}
