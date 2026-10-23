import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLazyGeekflareClient, GeekflareAPIError, getGeekflareClient, normalizeUrl } from '../client.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('getGeekflareClient', () => {
  const originalApiKey = process.env.GEEKFLARE_API_KEY;

  beforeEach(() => {
    delete process.env.GEEKFLARE_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.GEEKFLARE_API_KEY;
    } else {
      process.env.GEEKFLARE_API_KEY = originalApiKey;
    }
  });

  it('throws a clear error when no API key is available', () => {
    expect(() => getGeekflareClient()).toThrow(
      'Geekflare API key is required. Pass { apiKey } or set the GEEKFLARE_API_KEY environment variable.',
    );
  });

  it('posts JSON with the API key header and drops undefined fields', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ apiStatus: 'success', data: { ok: true } }));
    const client = getGeekflareClient({ apiKey: 'gf-test', baseURL: 'https://api.example.test/', fetch });

    const response = await client.post('up', { url: 'https://example.com', followRedirect: undefined });

    expect(response.data).toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/up');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe('gf-test');
    expect(init.headers['User-Agent']).toBe('mastra');
    expect(JSON.parse(init.body)).toEqual({ url: 'https://example.com' });
  });

  it('falls back to GEEKFLARE_API_KEY', async () => {
    process.env.GEEKFLARE_API_KEY = 'gf-env';
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ data: null }));

    await getGeekflareClient({ fetch }).post('up', { url: 'https://example.com' });

    expect(fetch.mock.calls[0]![1].headers['x-api-key']).toBe('gf-env');
  });

  it('throws GeekflareAPIError with the API message on a non-2xx response', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ apiStatus: 'failure', message: 'Invalid API key' }, 401));
    const client = getGeekflareClient({ apiKey: 'bad', fetch });

    const error = await client.post('search', { query: 'x' }).catch(e => e);

    expect(error).toBeInstanceOf(GeekflareAPIError);
    expect(error.status).toBe(401);
    expect(error.message).toContain('Invalid API key');
  });

  it('throws when the API reports failure with HTTP 200', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ apiStatus: 'failure', message: 'Target unreachable' }));

    await expect(getGeekflareClient({ apiKey: 'gf', fetch }).post('up', { url: 'x' })).rejects.toThrow(
      'Target unreachable',
    );
  });

  it('throws on a malformed (non-JSON) response', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

    await expect(getGeekflareClient({ apiKey: 'gf', fetch }).post('up', { url: 'x' })).rejects.toThrow(
      'malformed response (HTTP 502)',
    );
  });

  it('creates the client only once when the lazy getter is first used', () => {
    const getClient = createLazyGeekflareClient({ apiKey: 'gf-test' });

    expect(getClient()).toBe(getClient());
  });

  it('defers the missing-key error until the lazy getter is called', () => {
    const getClient = createLazyGeekflareClient();

    expect(() => getClient()).toThrow('Geekflare API key is required');
  });
});

describe('normalizeUrl', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['  example.com/path  ', 'https://example.com/path'],
    ['example.com/r?next=https://other.org', 'https://example.com/r?next=https://other.org'],
    ['https://example.com', 'https://example.com'],
    ['HTTP://example.com', 'HTTP://example.com'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });
});
