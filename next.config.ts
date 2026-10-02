import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  // On Windows, restored dev caches have returned 404 for nested book routes.
  // Recompile on startup so approval and download handlers stay discoverable.
  experimental: { turbopackFileSystemCacheForDev: process.platform !== "win32" },
  poweredByHeader: false,
  devIndicators: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};
export default config;
