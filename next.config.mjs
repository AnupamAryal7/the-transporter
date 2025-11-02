/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['thetransporter.biwas.xyz', 'localhost'],
    unoptimized: true,
  },
}

export default nextConfig
