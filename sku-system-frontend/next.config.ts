import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', '@tanstack/react-query-devtools'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        destination: '/_next/static/chunks/:path*',
      },
    ];
  },
  // Production optimizations
  images: {
    domains: ['localhost', 'vercel.app'],
  },
  // Enable static exports for better performance
  trailingSlash: false,
  // Optimize bundle size
  swcMinify: true,
};

export default nextConfig;
