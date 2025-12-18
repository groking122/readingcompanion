/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;
    
    // Handle pdfjs-dist for server-side
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "pdfjs-dist/legacy/build/pdf.mjs": require.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
        "pdfjs-dist": require.resolve("pdfjs-dist"),
      };
    }
    
    // Handle epubjs worker
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
  // Allow ESM packages
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'pdf-parse'],
  },
}

module.exports = nextConfig

