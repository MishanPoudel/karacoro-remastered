/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }

    config.externals = config.externals || [];
    config.externals.push({
      'bufferutil': 'bufferutil',
      'utf-8-validate': 'utf-8-validate',
    });

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };

    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        minimize: false,
      };
    }

    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    const connectSrc = [
      "'self'",
      "https://www.googleapis.com",
      "https://www.youtube.com",
      "wss:",
      "ws:",
      ...(isDev ? ["http://localhost:3001"] : [process.env.NEXT_PUBLIC_SOCKET_URL || ""])
    ].join(' ');

    const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://img.youtube.com https://i.ytimg.com",
    `connect-src ${connectSrc}`,
    "font-src 'self'",
    "media-src 'self'",
    "frame-src https://www.youtube.com"
  ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/room/:path*',
        destination: '/rooms/:path*',
        permanent: true,
      },
    ];
  },

  output: 'standalone',
  trailingSlash: false,
  reactStrictMode: false,
};

module.exports = nextConfig;
