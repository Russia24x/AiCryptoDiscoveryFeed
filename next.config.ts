import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize OpenNext Cloudflare bindings (R2, D1, DO, etc.) for local dev.
// In production, bindings are injected by the Cloudflare Workers runtime.
// This must run at module load time so the bindings are available before
// the Next.js dev server starts handling requests.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  typescript: {
    // Fail the build on TypeScript errors — production safety.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  experimental: {
    // Tree-shake barrel imports for these libraries to reduce bundle size.
    // lucide-react and framer-motion both export hundreds of icons/components
    // from a single index — without this, the whole barrel gets bundled.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Cloudflare Workers doesn't support the default Next.js image optimizer
  // (sharp + filesystem cache). Disable it so images are served as-is from
  // Workers Static Assets. The `smart-image` component already handles
  // fallbacks and lazy-loading client-side.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
