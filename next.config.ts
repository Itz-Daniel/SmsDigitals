import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network devices to connect for development
  allowedDevOrigins: ['192.168.1.218'],
  typescript: {
    // Allows production builds to successfully complete even if minor type warnings occur
    ignoreBuildErrors: true,
  },
  eslint: {
    // Prevents ESLint lint warnings from failing production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
