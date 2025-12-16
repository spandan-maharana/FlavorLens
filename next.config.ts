import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3-media0.fl.yelpcdn.com",
      },
      {
        protocol: "https",
        hostname: "s3-media1.fl.yelpcdn.com",
      },
      {
        protocol: "https",
        hostname: "s3-media2.fl.yelpcdn.com",
      },
      {
        protocol: "https",
        hostname: "s3-media3.fl.yelpcdn.com",
      },
    ],
  },
};

export default nextConfig;