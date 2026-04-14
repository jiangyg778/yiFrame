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
    '@miro/shared-ui',
    '@miro/shared-state',
    '@miro/shared-utils',
  ],
};

export default nextConfig;
