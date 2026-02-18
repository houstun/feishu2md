import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@larksuiteoapi/node-sdk"],
};

export default nextConfig;
