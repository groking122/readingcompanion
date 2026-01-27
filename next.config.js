/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    config.resolve.alias.canvas = false;
    
    // Use memory cache instead of filesystem cache to avoid Windows file locking issues
    if (dev) {
      config.cache = {
        type: 'memory',
        maxGenerations: 1,
      };
    }
    
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
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse'],
}

module.exports = nextConfig

