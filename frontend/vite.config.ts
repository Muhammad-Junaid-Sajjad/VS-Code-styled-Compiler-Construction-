import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: true },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
