import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit:integrations/geekflare',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
