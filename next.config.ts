import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["convex/react"],
  },
};

export default nextConfig;
