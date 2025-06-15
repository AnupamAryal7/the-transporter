/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://thetransporter.biwas.xyz',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['thetransporter.biwas.xyz'],
    unoptimized: true,
  },
}

export default nextConfig
