import localeRewrites from '../../packages/micro-core/src/locale-rewrites.runtime.js';

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  env: {
    MAIN_APP_ORIGIN: process.env.MAIN_APP_ORIGIN || 'http://localhost:3000',
  },
  transpilePackages: [
    '@miro/micro-core',
    '@miro/request-core',
    '@miro/shared-ui',
    '@miro/shared-state',
    '@miro/shared-utils',
  ],
  // Rewrite locale-prefixed URLs onto the underlying page so every main page
  // under `/<locale>/...` renders without needing a duplicate file tree.
  // asPath is preserved, so the browser URL stays `/zh-cn/...` while Next
  // renders the existing page at `/...`.
  async rewrites() {
    return {
      beforeFiles: localeRewrites.createMainAppLocaleRewrites(),
    };
  },
};

export default nextConfig;
