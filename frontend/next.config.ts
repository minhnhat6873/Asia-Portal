import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
