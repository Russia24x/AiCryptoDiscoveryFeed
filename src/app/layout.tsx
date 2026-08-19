import type { Metadata, Viewport } from "next";
import { Vazirmatn, Inter, JetBrains_Mono } from "next/font/google";
import "@fontsource/estedad/800.css";
import "@fontsource/estedad/900.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/brand/pwa-install-prompt";
import { Providers } from "./providers";

// Vazirmatn — primary Persian UI font (clean, modern, readable for body text).
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

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
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
    shortcut: ["/favicon.svg"],
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
      <body
        className={`${vazirmatn.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
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
