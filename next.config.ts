import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.heygen.ai",
      },
    ],
  },
};

export default nextConfig;
