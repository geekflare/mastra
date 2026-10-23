import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createLazyGeekflareClient, normalizeUrl } from './client.js';
import type { GeekflareClientOptions } from './client.js';

const formats = ['markdown', 'markdown-llm', 'text', 'text-llm', 'html', 'html-llm', 'json'] as const;

const inputSchema = z.object({
  url: z.string().min(1).describe('URL of the public page to scrape. Bare domains such as example.com are accepted.'),
  formats: z
    .array(z.enum(formats))
    .min(1)
    .max(3)
    .optional()
    .describe('Output formats, up to three. Defaults to ["markdown"]. The -llm variants strip boilerplate for LLMs.'),
  renderJS: z
    .boolean()
    .optional()
    .describe('Render JavaScript before extracting. When omitted, Geekflare decides based on the page.'),
  template: z
    .enum(['product', 'contact'])
    .optional()
    .describe('Ready-made extraction template that returns structured JSON for product or contact pages.'),
});

const outputSchema = z.object({
  url: z.string(),
  content: z
    .record(z.string(), z.unknown())
    .describe('Scraped content keyed by format, for example { markdown: "..." }.'),
});

export function createGeekflareScrapeTool(config?: GeekflareClientOptions) {
  const getClient = createLazyGeekflareClient(config);

  return createTool({
    id: 'geekflare-scrape',
    description:
      'Fetch a public web page with Geekflare and return its content as Markdown, text, HTML, or JSON. Use it to read a page the user mentions or a search result.',
    inputSchema,
    outputSchema,
    execute: async input => {
      const url = normalizeUrl(input.url);
      const response = await getClient().post<unknown>('webscraping', {
        url,
        format: input.formats ?? ['markdown'],
        renderJS: input.renderJS,
        extractionMode: input.template ? 'template' : undefined,
        template: input.template,
      });

      const data = response.data;
      const content =
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : { [input.formats?.[0] ?? 'markdown']: data };
      return { url, content };
    },
  });
}
