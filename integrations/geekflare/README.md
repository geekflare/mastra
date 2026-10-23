# @mastra/geekflare

Add Geekflare tools to Mastra agents: live web search (including the full Google results page by country or city), page scraping to Markdown or JSON, brand and company data, screenshots, and website checks, with typed Zod inputs and outputs.

## Installation

```bash
npm install @mastra/geekflare
```

## Usage

Set `GEEKFLARE_API_KEY` before using the tools. Get a key at [geekflare.com/api](https://geekflare.com/api).

```typescript
import { Agent } from '@mastra/core/agent';
import { createGeekflareTools } from '@mastra/geekflare';

export const researchAgent = new Agent({
  id: 'research-agent',
  name: 'Research Agent',
  model: 'openai/gpt-5.6-sol',
  instructions: 'Search the web, read the most relevant pages, and cite your sources.',
  tools: createGeekflareTools(),
});
```

| Tool                    | ID                        | What it does                                                             |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `geekflareSearch`       | `geekflare-search`        | Web, news, or image search. Set `serp` for the full Google results page. |
| `geekflareScrape`       | `geekflare-scrape`        | Page content as Markdown, text, HTML, or JSON.                           |
| `geekflareBrand`        | `geekflare-brand`         | Logos, colors, fonts, social profiles, key links, and company details.   |
| `geekflareScreenshot`   | `geekflare-screenshot`    | Screenshot of a page as a hosted image URL.                              |
| `geekflareWebsiteCheck` | `geekflare-website-check` | Uptime, DNS, TLS, redirects, broken links, load time, or Lighthouse.     |

## Documentation

- [Geekflare](https://mastra.ai/integrations/tools/geekflare)
- [Geekflare API docs](https://docs.geekflare.com)

## Support

We have an [open community Discord](https://discord.gg/mastra-ai). Come and say hello and let us know if you have any questions or need any help getting things running.
