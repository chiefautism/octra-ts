export class OctraRpcError extends Error {
  readonly code?: number;
  readonly data?: unknown;

  constructor(message: string, options: { code?: number; data?: unknown } = {}) {
    super(message);
    this.name = 'OctraRpcError';
    this.code = options.code;
    this.data = options.data;
  }
}

export class OctraHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`HTTP request failed with status ${status}`);
    this.name = 'OctraHttpError';
    this.status = status;
    this.body = body;
  }
}

export class OctraParseError extends Error {
  readonly body: string;

  constructor(body: string) {
    super('Could not parse Octra RPC response as JSON');
    this.name = 'OctraParseError';
    this.body = body;
  }
}
