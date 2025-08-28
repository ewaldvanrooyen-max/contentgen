/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  reactStrictMode: true,
  output: 'standalone'
};
module.exports = nextConfig;
