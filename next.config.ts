import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network devices to connect for development
  allowedDevOrigins: ['192.168.1.218'],
};

export default nextConfig;
