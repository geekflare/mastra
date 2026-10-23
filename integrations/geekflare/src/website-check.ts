import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createLazyGeekflareClient, normalizeUrl } from './client.js';
import type { GeekflareClientOptions } from './client.js';

/** Check name -> Geekflare endpoint path. */
export const WEBSITE_CHECKS = {
  site_status: 'up',
  dns_records: 'dnsrecord',
  tls_scan: 'tlsscan',
  redirect_check: 'redirectcheck',
  broken_links: 'brokenlink',
  load_time: 'loadtime',
  lighthouse: 'lighthouse',
} as const;

export type WebsiteCheck = keyof typeof WEBSITE_CHECKS;

const checkNames = Object.keys(WEBSITE_CHECKS) as [WebsiteCheck, ...WebsiteCheck[]];

const inputSchema = z.object({
  url: z.string().min(1).describe('Website URL or domain, for example example.com.'),
  check: z
    .enum(checkNames)
    .describe(
      'Which check to run: site_status (up or down with HTTP status), dns_records, tls_scan (certificate and TLS versions), redirect_check (each hop), broken_links, load_time (DNS, connect, TLS, first byte), or lighthouse (performance, SEO, accessibility scores; can take a minute).',
    ),
});

const outputSchema = z.object({
  url: z.string(),
  check: z.enum(checkNames),
  message: z.string().optional(),
  result: z.unknown().describe('The check result as returned by Geekflare.'),
});

export function createGeekflareWebsiteCheckTool(config?: GeekflareClientOptions) {
  const getClient = createLazyGeekflareClient(config);

  return createTool({
    id: 'geekflare-website-check',
    description:
      'Run one website check with Geekflare: uptime, DNS records, TLS/SSL certificate, redirect chain, broken links, load time, or a Lighthouse audit. Reports findings only; it does not change the website.',
    inputSchema,
    outputSchema,
    execute: async input => {
      const url = normalizeUrl(input.url);
      const response = await getClient().post<unknown>(WEBSITE_CHECKS[input.check], { url });
      return { url, check: input.check, message: response.message, result: response.data };
    },
  });
}
