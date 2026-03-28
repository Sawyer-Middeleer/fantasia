import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fantasia/integrations",
    "@fantasia/backend",
    "@fantasia/auth",
    "@fantasia/billing",
  ],
};

export default nextConfig;
