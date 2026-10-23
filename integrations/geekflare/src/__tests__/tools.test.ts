import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGeekflareBrandTool } from '../brand.js';
import { createGeekflareScrapeTool } from '../scrape.js';
import { createGeekflareScreenshotTool } from '../screenshot.js';
import { createGeekflareSearchTool } from '../search.js';
import { createGeekflareTools } from '../tools.js';
import { createGeekflareWebsiteCheckTool, WEBSITE_CHECKS } from '../website-check.js';

function mockFetch(body: unknown, status = 200) {
  return vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

function sentBody(fetch: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetch.mock.calls[0]![1].body);
}

function sentPath(fetch: ReturnType<typeof vi.fn>) {
  return new URL(fetch.mock.calls[0]![0]).pathname;
}

// createTool's execute takes (input, context); these tools only use the input.
const context = {} as never;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createGeekflareTools', () => {
  it('returns all tools without requiring an API key up front', () => {
    const tools = createGeekflareTools();

    expect(Object.keys(tools)).toEqual([
      'geekflareSearch',
      'geekflareScrape',
      'geekflareBrand',
      'geekflareScreenshot',
      'geekflareWebsiteCheck',
    ]);
    expect(tools.geekflareSearch.id).toBe('geekflare-search');
    expect(tools.geekflareWebsiteCheck.id).toBe('geekflare-website-check');
    for (const tool of Object.values(tools)) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
    }
  });
});

describe('geekflare-search', () => {
  it('maps result lists and sends only the provided options', async () => {
    const fetch = mockFetch({
      apiStatus: 'success',
      data: [
        { title: 'Geekflare', url: 'https://geekflare.com/', snippet: 'Web data APIs', position: 1 },
        { title: 'No URL' },
      ],
    });
    const tool = createGeekflareSearchTool({ apiKey: 'gf', fetch });

    const output = await tool.execute!({ query: 'geekflare api', limit: 2, location: 'GB' }, context);

    expect(sentPath(fetch)).toBe('/search');
    expect(sentBody(fetch)).toEqual({ query: 'geekflare api', limit: 2, location: 'gb' });
    expect(output).toEqual({
      results: [{ title: 'Geekflare', url: 'https://geekflare.com/', snippet: 'Web data APIs', position: 1 }],
    });
  });

  it('returns the full results page when serp is true', async () => {
    const serp = { organic: [{ title: 'A', link: 'https://a.test' }], ai_overview: { text: 'Summary' } };
    const fetch = mockFetch({ apiStatus: 'success', data: serp });
    const tool = createGeekflareSearchTool({ apiKey: 'gf', fetch });

    const output = await tool.execute!({ query: 'best crm', serp: true, location: 'us', city: 'Austin' }, context);

    expect(sentBody(fetch)).toEqual({ query: 'best crm', serp: true, location: 'us', city: 'Austin' });
    expect(output).toEqual({ results: [], serp });
  });
});

describe('geekflare-scrape', () => {
  it('requests markdown by default and normalizes bare domains', async () => {
    const fetch = mockFetch({ apiStatus: 'success', data: { markdown: '# Example Domain' } });
    const tool = createGeekflareScrapeTool({ apiKey: 'gf', fetch });

    const output = await tool.execute!({ url: 'example.com' }, context);

    expect(sentPath(fetch)).toBe('/webscraping');
    expect(sentBody(fetch)).toEqual({ url: 'https://example.com', format: ['markdown'] });
    expect(output).toEqual({ url: 'https://example.com', content: { markdown: '# Example Domain' } });
  });

  it('sends the template extraction mode when a template is chosen', async () => {
    const fetch = mockFetch({ apiStatus: 'success', data: { json: { name: 'Shoe' } } });
    const tool = createGeekflareScrapeTool({ apiKey: 'gf', fetch });

    await tool.execute!({ url: 'https://shop.test/p/1', template: 'product', formats: ['json'] }, context);

    expect(sentBody(fetch)).toEqual({
      url: 'https://shop.test/p/1',
      format: ['json'],
      extractionMode: 'template',
      template: 'product',
    });
  });
});

describe('geekflare-brand', () => {
  it('returns the name, domain, and full brand data', async () => {
    const data = { name: 'Stripe', domain: 'stripe.com', colors: { primary: '#533AFD' } };
    const fetch = mockFetch({ apiStatus: 'success', data });
    const tool = createGeekflareBrandTool({ apiKey: 'gf', fetch });

    const output = await tool.execute!({ url: 'stripe.com', mode: 'enriched' }, context);

    expect(sentBody(fetch)).toEqual({ url: 'https://stripe.com', mode: 'enriched' });
    expect(output).toEqual({ domain: 'stripe.com', name: 'Stripe', brand: data });
  });
});

describe('geekflare-screenshot', () => {
  it('returns the hosted image URL', async () => {
    const fetch = mockFetch({ apiStatus: 'success', data: 'https://cdn.geekflare.com/shot.png' });
    const tool = createGeekflareScreenshotTool({ apiKey: 'gf', fetch });

    const output = await tool.execute!({ url: 'example.com', fullPage: true }, context);

    expect(sentBody(fetch)).toEqual({ url: 'https://example.com', fullPage: true });
    expect(output).toEqual({ url: 'https://example.com', imageUrl: 'https://cdn.geekflare.com/shot.png' });
  });

  it('throws when no image URL comes back', async () => {
    const fetch = mockFetch({ apiStatus: 'success', data: null });
    const tool = createGeekflareScreenshotTool({ apiKey: 'gf', fetch });

    await expect(tool.execute!({ url: 'example.com' }, context)).rejects.toThrow('did not return an image URL');
  });
});

describe('geekflare-website-check', () => {
  it.each(Object.entries(WEBSITE_CHECKS))('routes %s to /%s', async (check, path) => {
    const fetch = mockFetch({ apiStatus: 'success', message: 'ok', data: { statusCode: 200 } });
    const tool = createGeekflareWebsiteCheckTool({ apiKey: 'gf', fetch });

    const output = await tool.execute!({ url: 'example.com', check: check as keyof typeof WEBSITE_CHECKS }, context);

    expect(sentPath(fetch)).toBe(`/${path}`);
    expect(sentBody(fetch)).toEqual({ url: 'https://example.com' });
    expect(output).toEqual({ url: 'https://example.com', check, message: 'ok', result: { statusCode: 200 } });
  });

  it('rejects checks that are not offered', () => {
    const tool = createGeekflareWebsiteCheckTool({ apiKey: 'gf' });

    expect(tool.inputSchema!.safeParse({ url: 'example.com', check: 'dnssec' }).success).toBe(false);
  });
});
