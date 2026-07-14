import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network devices to connect for development
  allowedDevOrigins: ['192.168.1.218', ],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
