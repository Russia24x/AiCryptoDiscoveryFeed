import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility — don't use standalone output
  // (CF Pages uses @cloudflare/next-on-pages to build the worker)
  // output: "standalone",
  typescript: {
    // Fail the build on TypeScript errors — production safety.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Enable experimental features needed for CF Pages
  experimental: {
    // Needed for @cloudflare/next-on-pages
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Disable image optimization (CF Pages doesn't support the default loader)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
