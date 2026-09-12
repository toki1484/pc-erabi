// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 独自ドメイン取得後にここを差し替える。それまでは Cloudflare Pages の
  // *.pages.dev サブドメインで運用する。
  site: 'https://pc-erabi.pages.dev',
});
