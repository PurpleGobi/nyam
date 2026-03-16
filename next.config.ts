import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "search.pstatic.net" },
      { protocol: "https", hostname: "ldb-phinf.pstatic.net" },
    ],
  },
};

export default nextConfig;
