/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: []
  },
  images: {
    domains: [
      'cdn.discordapp.com',
      'images.unsplash.com',
      'avatars.githubusercontent.com'
    ]
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.API_SERVICE_URL || 'http://localhost:3001'}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;