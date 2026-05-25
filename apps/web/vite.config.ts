import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Consume the schemas SOURCE, not the CJS dist barrel. tsc compiles the
      // barrel's `export *` to runtime `__exportStar`, whose named exports
      // Vite's native-ESM importer cannot statically detect — breaking every
      // named import at runtime. Aliasing to src also kills stale-dist friction.
      '@rainpath/schemas': fileURLToPath(
        new URL('../../packages/schemas/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
  },
});
