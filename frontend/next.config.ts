import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow calling local Flask API during dev
  async rewrites() {
    return [];
  },
};

export default nextConfig;
