import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["macmini:3001", "localhost:3001", "127.0.0.1:3001"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
