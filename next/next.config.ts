import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@larksuiteoapi/node-sdk"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
