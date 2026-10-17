import type { NextConfig } from "next";

const apiOrigin = (
  process.env.SOCIALTRADE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.SOCIALTRADE_E2E === "1" ? ".next-e2e" : ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
