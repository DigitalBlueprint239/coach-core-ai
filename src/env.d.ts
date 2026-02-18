/**
 * Type augmentation for import.meta.env (Vite-style environment variables).
 * Required because this CRA project uses import.meta.env throughout.
 */
interface ImportMetaEnv {
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
