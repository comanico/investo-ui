import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Parent D:\Git has its own lockfile; without this Next treats that as the
  // workspace root and the build worker looks for pages/_app.js in the wrong tree.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  eslint: {
    // Platform files under src/lib predate this app and fail Next's build lint.
    ignoreDuringBuilds: true,
  },
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
