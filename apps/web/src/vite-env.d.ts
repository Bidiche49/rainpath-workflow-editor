/// <reference types="vite/client" />

// Narrow the env keys this app reads so `import.meta.env.VITE_API_URL` is
// typed `string | undefined` instead of the `any` from vite/client's index
// signature (project bans `any`). Merges with vite's own interface.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
