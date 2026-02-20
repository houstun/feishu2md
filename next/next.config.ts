import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@larksuiteoapi/node-sdk", "ali-oss"],
};

export default nextConfig;
