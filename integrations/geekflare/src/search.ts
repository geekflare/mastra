import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createLazyGeekflareClient } from './client.js';
import type { GeekflareClientOptions } from './client.js';

const inputSchema = z.object({
  query: z.string().min(1).describe('Search query.'),
  limit: z.number().int().min(1).max(100).optional().describe('Number of results to return. Defaults to 10.'),
  source: z.enum(['web', 'news', 'images']).optional().describe('What to search. Defaults to web.'),
  location: z
    .string()
    .length(2)
    .optional()
    .describe('ISO 3166-1 alpha-2 country code for localized results, for example "us" or "gb".'),
  city: z
    .string()
    .optional()
    .describe('City for localized results, combined with location. Only used when serp is true.'),
  time: z
    .string()
    .optional()
    .describe('Recency filter: h, d, w, m, or y (past hour, day, week, month, year), or forms such as d7 or h6.'),
  includeDomains: z.array(z.string()).optional().describe('Only return results from these domains.'),
  excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains.'),
  serp: z
    .boolean()
    .optional()
    .describe(
      'Return the full Google results page instead of a result list: organic results, AI Overview, People Also Ask, and related searches.',
    ),
});

const searchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  position: z.number().optional(),
});

const outputSchema = z.object({
  results: z.array(searchResultSchema).describe('Ranked results. Empty when serp is true.'),
  serp: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('The full Google results page, returned when serp is true.'),
});

type RawResult = {
  title?: unknown;
  url?: unknown;
  link?: unknown;
  snippet?: unknown;
  description?: unknown;
  position?: unknown;
};

function toResults(items: unknown[]) {
  return items
    .filter((item): item is RawResult => !!item && typeof item === 'object')
    .map(item => ({
      title: String(item.title ?? ''),
      url: String(item.url ?? item.link ?? ''),
      snippet: String(item.snippet ?? item.description ?? ''),
      position: typeof item.position === 'number' ? item.position : undefined,
    }))
    .filter(result => result.url);
}

export function createGeekflareSearchTool(config?: GeekflareClientOptions) {
  const getClient = createLazyGeekflareClient(config);

  return createTool({
    id: 'geekflare-search',
    description:
      'Search the live web, news, or images with Geekflare. Set serp to get the full Google results page, localized by country or city.',
    inputSchema,
    outputSchema,
    execute: async input => {
      const response = await getClient().post<unknown>('search', {
        query: input.query,
        limit: input.limit,
        source: input.source,
        location: input.location?.toLowerCase(),
        city: input.city,
        time: input.time,
        includeDomains: input.includeDomains,
        excludeDomains: input.excludeDomains,
        serp: input.serp,
      });

      const data = response.data;
      if (Array.isArray(data)) return { results: toResults(data) };
      return { results: [], serp: (data ?? {}) as Record<string, unknown> };
    },
  });
}
