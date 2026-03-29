import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Ensure proper binding in container
  experimental: {
    // @ts-ignore - Next.js internal config
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Optional: Configure image optimization for external images
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: 'https',
  //       hostname: 'example.com',
  //     },
  //   ],
  // },
};

export default nextConfig;
