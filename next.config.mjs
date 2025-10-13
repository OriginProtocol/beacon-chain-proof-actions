/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@electric-sql/pglite'],
  output: 'standalone',
};

export default nextConfig;
