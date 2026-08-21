import type { Metadata, Viewport } from "next";
import "@fontsource/estedad/800.css";
import "@fontsource/estedad/900.css";
// Self-hosted fonts (no build-time fetch to fonts.googleapis.com).
// Each weight is imported individually to keep bundle small.
// Vazirmatn: 300-900 (primary Persian UI font)
import "@fontsource/vazirmatn/300.css";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/vazirmatn/900.css";
// Inter: 300-900 (Latin/numbers)
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
// JetBrains Mono: 400, 500, 700 (code blocks)
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/brand/pwa-install-prompt";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ai Crypto Discovery — آینده رمزنگاری، هوش مصنوعی و فناوری",
  description:
    "پلتفرم کشف هوشمند محتوای ارزهای دیجیتال، هوش مصنوعی، فناوری و بازی‌های ویدیویی. منابع خبری، کانال‌های تلگرام و توییتر را در یک پلتفرم مینیمال و داده‌محور متمرکز کنید.",
  keywords: [
    "ارز دیجیتال",
    "هوش مصنوعی",
    "فناوری",
    "بازی ویدیویی",
    "crypto",
    "AI",
    "Ai Crypto Discovery",
    "بیت‌کوین",
    "اتریوم",
    "DeFi",
  ],
  authors: [{ name: "Ai Crypto Discovery" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/icon-192.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ai Crypto Discovery",
  },
  openGraph: {
    title: "Ai Crypto Discovery",
    description:
      "کشف هوشمند محتوای ارز دیجیتال، هوش مصنوعی، فناوری و بازی — آینده‌نگر، داده‌محور، مینیمال.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Ai Crypto Discovery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ai Crypto Discovery",
    description: "کشف هوشمند محتوای آینده‌نگر",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0f12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
        <PWAInstallPrompt />
        <Toaster />
        <SonnerToaster
          position="bottom-center"
          richColors
          closeButton
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--brand-surface)",
              border: "1px solid var(--brand-border)",
              color: "var(--brand-text)",
            },
          }}
        />
      </body>
    </html>
  );
}
