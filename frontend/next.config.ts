import type { NextConfig } from "next";
import { getApiOrigin } from "./src/lib/api-origin";

const apiOrigin = getApiOrigin();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.SOCIALTRADE_E2E === "1" ? ".next-e2e" : ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
