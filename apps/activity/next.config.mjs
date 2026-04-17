/**
 * @type {import('next').NextConfig}
 *
 * NOTE: This sub-app does NOT know about locales.
 *   The main-app proxy (apps/main/server.js) is responsible for stripping
 *   the `/<locale>` prefix from both the routing decision AND the URL it
 *   forwards here. Activity sees a clean `/activity/...` path exactly as
 *   it would without any i18n in the system.
 *   The only visible locale signal inside activity is the cookie, read
 *   via `useLocale()` / SSR snapshot helpers.
 */
const nextConfig = {
  reactStrictMode: true,

  basePath: '/activity',
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
};

export default nextConfig;
