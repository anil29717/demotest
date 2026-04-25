import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "images.unsplash.com",
      "cloudinary.com",
      "res.cloudinary.com",
      "s3.amazonaws.com",
      "localhost",
    ],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disk pack cache (.next/cache/webpack/*.pack.gz) can ENOENT on Windows when
      // the folder is cleared mid-build or another process touches it; memory avoids that.
      config.cache = { type: "memory" };
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
