import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@larksuiteoapi/node-sdk", "ali-oss"],
};

export default nextConfig;
