import type { Metadata, Viewport } from "next";
import { Vazirmatn, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  openGraph: {
    title: "Ai Crypto Discovery",
    description:
      "کشف هوشمند محتوای ارز دیجیتال، هوش مصنوعی، فناوری و بازی — آینده‌نگر، داده‌محور، مینیمال.",
    type: "website",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ai Crypto Discovery",
    description: "کشف هوشمند محتوای آینده‌نگر",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0f12",
  width: "device-width",
  initialScale: 1,
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
