import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Platform files under src/lib predate this app and fail Next's build lint.
    ignoreDuringBuilds: true,
  },
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
