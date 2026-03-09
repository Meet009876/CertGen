import type { NextConfig } from "next";

// In Docker: INTERNAL_API_URL=http://app:8000 (service-to-service, internal Docker network)
// Locally:   falls back to http://127.0.0.1:8000 (plain local dev without Docker)
const internalApiUrl = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`
      }
    ]
  }
};

export default nextConfig;
