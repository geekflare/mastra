export const DEFAULT_BASE_URL = 'https://api.geekflare.com';
export const DEFAULT_TIMEOUT_MS = 180_000;

export interface GeekflareClientOptions {
  /** Geekflare API key. Defaults to the `GEEKFLARE_API_KEY` environment variable. */
  apiKey?: string;
  /** API base URL. Defaults to `https://api.geekflare.com`. */
  baseURL?: string;
  /** Request timeout in milliseconds. Defaults to 180000; Lighthouse audits can take a minute or more. */
  timeoutMs?: number;
  /** Custom fetch implementation. */
  fetch?: typeof globalThis.fetch;
}

/** The response envelope every Geekflare endpoint returns. */
export interface GeekflareResponse<T = unknown> {
  apiStatus?: string;
  apiCode?: number;
  message?: string;
  meta?: Record<string, unknown>;
  data: T;
}

export class GeekflareAPIError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GeekflareAPIError';
    this.status = status;
  }
}

export interface GeekflareClient {
  post<T = unknown>(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<GeekflareResponse<T>>;
}

/** Accept bare domains such as `example.com` by adding `https://` when no scheme is present. */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed && !/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
}

export function getGeekflareClient(config?: GeekflareClientOptions): GeekflareClient {
  const apiKey = config?.apiKey ?? process.env.GEEKFLARE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Geekflare API key is required. Pass { apiKey } or set the GEEKFLARE_API_KEY environment variable.',
    );
  }

  const baseURL = (config?.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetch = config?.fetch ?? globalThis.fetch;

  return {
    async post<T>(path: string, body: Record<string, unknown>, signal?: AbortSignal) {
      const payload = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
      const timeout = AbortSignal.timeout(timeoutMs);

      const response = await fetch(`${baseURL}/${path}`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'User-Agent': 'mastra' },
        body: JSON.stringify(payload),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new GeekflareAPIError(
          `Geekflare ${path} returned a malformed response (HTTP ${response.status}).`,
          response.status,
        );
      }

      const record = (json && typeof json === 'object' ? json : { data: json }) as GeekflareResponse<T>;
      if (!response.ok || record.apiStatus === 'failure') {
        const message = typeof record.message === 'string' ? record.message : response.statusText || 'request failed';
        throw new GeekflareAPIError(`Geekflare ${path} failed (HTTP ${response.status}): ${message}`, response.status);
      }
      return record;
    },
  };
}

export function createLazyGeekflareClient(config?: GeekflareClientOptions): () => GeekflareClient {
  let client: GeekflareClient | undefined;

  return () => {
    client ??= getGeekflareClient(config);
    return client;
  };
}
