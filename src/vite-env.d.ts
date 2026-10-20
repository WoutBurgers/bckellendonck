/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Only needed when the API runs on a different domain than the website. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
