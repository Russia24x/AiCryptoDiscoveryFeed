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
  // Security headers applied to ALL responses (pages + API routes).
  // The `public/_headers` file only affects static-assets layer responses,
  // NOT Worker-generated responses. Since every page is "use client" and
  // every /api/* route is force-dynamic, 100% of responses go through the
  // Worker — so _headers rules never fire. This headers() function is the
  // correct way to apply headers in an OpenNext + Cloudflare Workers setup.
  // Reference: OpenNext docs classify next.config.js headers() as part of
  // its routing/middleware layer, which the Cloudflare adapter fully implements.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
