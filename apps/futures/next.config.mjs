/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/futures',
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
