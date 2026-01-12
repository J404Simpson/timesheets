/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AAD_CLIENT_ID?: string;
  readonly VITE_AAD_TENANT_ID?: string;
  readonly VITE_AAD_API_SCOPE?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;

  readonly VITE_LOCAL_AAD_CLIENT_ID?: string;
  readonly VITE_LOCAL_AAD_TENANT_ID?: string;
  readonly VITE_LOCAL_AAD_API_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
