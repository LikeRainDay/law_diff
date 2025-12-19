import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/compare',
        destination: 'http://127.0.0.1:8000/api/compare',
      },
      {
        source: '/health',
        destination: 'http://127.0.0.1:8000/health',
      },
    ]
  },
};

export default nextConfig;
