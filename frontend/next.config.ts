import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Enable static export for Render deployment
  images: {
    unoptimized: true, // Required when using static export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
