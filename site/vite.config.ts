import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base + hash routing: the build works under any GitHub Pages sub-path
// (/<repo>/) and from a plain static server, with no per-environment config.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true, open: true },
  preview: { port: 4173, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
