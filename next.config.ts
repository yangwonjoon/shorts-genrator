import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "fluent-ffmpeg"],
  outputFileTracingIncludes: {
    "/api/**": ["./output/**"],
  },
};

export default nextConfig;
