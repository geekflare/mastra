import { createGeekflareBrandTool } from './brand.js';
import type { GeekflareClientOptions } from './client.js';
import { createGeekflareScrapeTool } from './scrape.js';
import { createGeekflareScreenshotTool } from './screenshot.js';
import { createGeekflareSearchTool } from './search.js';
import { createGeekflareWebsiteCheckTool } from './website-check.js';

export function createGeekflareTools(config?: GeekflareClientOptions) {
  return {
    geekflareSearch: createGeekflareSearchTool(config),
    geekflareScrape: createGeekflareScrapeTool(config),
    geekflareBrand: createGeekflareBrandTool(config),
    geekflareScreenshot: createGeekflareScreenshotTool(config),
    geekflareWebsiteCheck: createGeekflareWebsiteCheckTool(config),
  };
}
