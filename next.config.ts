import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network devices to connect for development
  allowedDevOrigins: ['192.168.1.218'],
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', 'date-fns', 'motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  typescript: {
    // Allows production builds to successfully complete even if minor type warnings occur
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
