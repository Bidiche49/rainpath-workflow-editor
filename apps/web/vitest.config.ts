import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Standalone Vitest config (mirrors packages/schemas). We deliberately do NOT
// reuse vite.config.ts here: it pulls @vitejs/plugin-react, which is typed
// against the project's Vite 8 while Vitest bundles Vite 7 — the two clash under
// `exactOptionalPropertyTypes`. The plugin only adds fast-refresh (useless in
// tests); JSX is transformed by esbuild, with `jsx: 'automatic'` forcing the
// React 18 runtime so B-01/B-02 component tests need no React import.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/components/ui/**',
        // Vite entry point: bootstraps React onto #root, nothing to assert.
        'src/main.tsx',
        // Pure route table (path → element wiring) consumed by main.tsx; the
        // pages it references are tested, the createBrowserRouter config is not.
        'src/router.tsx',
        // Ambient type declarations only — no runtime code.
        'src/vite-env.d.ts',
      ],
    },
  },
});
