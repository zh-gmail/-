/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BAIDU_API_KEY: string;
  readonly VITE_BAIDU_SECRET_KEY: string;
  readonly VITE_DASHSCOPE_API_KEY: string;
  readonly VITE_FAL_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
