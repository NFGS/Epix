import type { ZodType } from 'zod';

export class TvmazeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TvmazeError';
  }
}

export class TvmazeNotFoundError extends TvmazeError {
  constructor(message = 'TVmaze no encontró el recurso solicitado.') {
    super(message);
    this.name = 'TvmazeNotFoundError';
  }
}

export class TvmazeNetworkError extends TvmazeError {
  constructor(message = 'No se pudo conectar con TVmaze.') {
    super(message);
    this.name = 'TvmazeNetworkError';
  }
}

export class TvmazeHttpError extends TvmazeError {
  readonly status: number;

  constructor(status: number, message = `TVmaze respondió con estado ${status}.`) {
    super(message);
    this.name = 'TvmazeHttpError';
    this.status = status;
  }
}

export interface TvmazeClient {
  get<T>(path: string, schema: ZodType<T>): Promise<T>;
}

export interface TvmazeClientOptions {
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.tvmaze.com';
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 800;

export function realSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  );
}

export function createTvmazeClient(options: TvmazeClientOptions = {}): TvmazeClient {
  const {
    fetchFn = fetch,
    sleepFn = realSleep,
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  async function fetchOnce(path: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchFn(`${baseUrl}${path}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new TvmazeNetworkError('TVmaze tardó demasiado en responder.');
      }

      throw new TvmazeNetworkError();
    } finally {
      clearTimeout(timer);
    }
  }

  async function request(path: string): Promise<Response> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const response = await fetchOnce(path);

      if (response.ok) {
        return response;
      }

      if (response.status === 404) {
        throw new TvmazeNotFoundError(`TVmaze no encontró ${path}.`);
      }

      const isRetriable = response.status === 429 || response.status >= 500;
      const isLastAttempt = attempt === MAX_ATTEMPTS - 1;

      if (!isRetriable || isLastAttempt) {
        throw new TvmazeHttpError(response.status);
      }

      await sleepFn(BASE_BACKOFF_MS * 2 ** attempt + Math.random() * 200);
    }

    throw new TvmazeNetworkError();
  }

  return {
    async get<T>(path: string, schema: ZodType<T>): Promise<T> {
      const response = await request(path);

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new TvmazeHttpError(response.status, 'TVmaze devolvió una respuesta ilegible.');
      }

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new TvmazeHttpError(
          response.status,
          'La respuesta de TVmaze no cumple el contrato esperado.',
        );
      }

      return parsed.data;
    },
  };
}
