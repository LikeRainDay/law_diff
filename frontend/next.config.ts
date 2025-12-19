import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Static export for production/Docker
  output: isProd ? 'export' : undefined,
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Dev-only forwarding
  async rewrites() {
    if (isProd) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://127.0.0.1:8000/health',
      },
    ];
  },
};

export default nextConfig;
