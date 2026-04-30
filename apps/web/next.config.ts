import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  onDemandEntries: {
    // Keep recently visited pages hot in dev for smoother sidebar navigation.
    maxInactiveAge: 1000 * 60 * 10,
    pagesBufferLength: 8,
  },
  images: {
    domains: [
      "images.unsplash.com",
      "cloudinary.com",
      "res.cloudinary.com",
      "s3.amazonaws.com",
      "localhost",
    ],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/uploads/**" },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disk pack cache (.next/cache/webpack/*.pack.gz) can ENOENT on Windows when
      // the folder is cleared mid-build or another process touches it; memory avoids that.
      config.cache = { type: "memory" };
      // Slightly reduce expensive source map processing in local dev route transitions.
      config.devtool = "eval-cheap-module-source-map";
    }
    return config;
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${api}/:path*`,
      },
    ];
  },
};

export default nextConfig;
