/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,

  basePath: '/activity',

  transpilePackages: [
    '@miro/micro-core',
    '@miro/shared-ui',
    '@miro/shared-state',
    '@miro/shared-utils',
  ],
};

export default nextConfig;
