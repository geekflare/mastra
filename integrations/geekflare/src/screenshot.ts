import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createLazyGeekflareClient, normalizeUrl } from './client.js';
import type { GeekflareClientOptions } from './client.js';

const inputSchema = z.object({
  url: z.string().min(1).describe('URL of the page to capture. Bare domains such as example.com are accepted.'),
  fullPage: z.boolean().optional().describe('Capture the full scrollable page instead of the viewport.'),
  device: z.enum(['desktop', 'mobile']).optional().describe('Device to emulate. Defaults to desktop.'),
  type: z.enum(['png', 'jpeg', 'webp']).optional().describe('Image format. Defaults to png.'),
  selector: z.string().optional().describe('CSS selector to capture a single element instead of the page.'),
});

const outputSchema = z.object({
  url: z.string().describe('The page that was captured.'),
  imageUrl: z.string().describe('Hosted URL of the screenshot.'),
});

export function createGeekflareScreenshotTool(config?: GeekflareClientOptions) {
  const getClient = createLazyGeekflareClient(config);

  return createTool({
    id: 'geekflare-screenshot',
    description: 'Capture a screenshot of a web page with Geekflare and return a hosted image URL.',
    inputSchema,
    outputSchema,
    execute: async input => {
      const url = normalizeUrl(input.url);
      const response = await getClient().post<unknown>('screenshot', {
        url,
        fullPage: input.fullPage,
        device: input.device,
        type: input.type,
        selector: input.selector,
      });

      if (typeof response.data !== 'string') {
        throw new Error('Geekflare screenshot did not return an image URL.');
      }
      return { url, imageUrl: response.data };
    },
  });
}
