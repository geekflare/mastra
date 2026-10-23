import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createLazyGeekflareClient, normalizeUrl } from './client.js';
import type { GeekflareClientOptions } from './client.js';

const inputSchema = z.object({
  url: z.string().min(1).describe('Company website URL or domain, for example stripe.com.'),
  mode: z
    .enum(['standard', 'enriched'])
    .optional()
    .describe(
      'standard returns brand assets. enriched adds company details such as industry, founded year, employee range, and target audience.',
    ),
});

const outputSchema = z.object({
  domain: z.string().optional(),
  name: z.string().optional(),
  brand: z
    .record(z.string(), z.unknown())
    .describe('Brand data: name, description, logos, colors, fonts, social profiles, key links, and company details.'),
});

export function createGeekflareBrandTool(config?: GeekflareClientOptions) {
  const getClient = createLazyGeekflareClient(config);

  return createTool({
    id: 'geekflare-brand',
    description:
      "Get a company's brand identity and company details from its website with Geekflare: logos, colors, fonts, social profiles, key links, and (in enriched mode) industry and size.",
    inputSchema,
    outputSchema,
    execute: async input => {
      const response = await getClient().post<Record<string, unknown>>('brand', {
        url: normalizeUrl(input.url),
        mode: input.mode,
      });

      const brand = response.data ?? {};
      return {
        domain: typeof brand.domain === 'string' ? brand.domain : undefined,
        name: typeof brand.name === 'string' ? brand.name : undefined,
        brand,
      };
    },
  });
}
