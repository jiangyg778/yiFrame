/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,

  basePath: '/account',

  transpilePackages: [
    '@miro/micro-core',
    '@miro/shared-ui',
    '@miro/shared-state',
    '@miro/shared-utils',
  ],
};

export default nextConfig;
