import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,

  reactStrictMode: false,

  // Don't bundle native Node modules — require them at runtime on the server only
  serverExternalPackages: ["pdf-parse", "pg", "@prisma/adapter-pg", "bcryptjs", "@prisma/client"],

  // Hide "X-Powered-By: Next.js" header to reduce attack surface
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // Security headers for all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=self, microphone=self, display-capture=self",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: '/meet/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, display-capture=*, fullscreen=*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
