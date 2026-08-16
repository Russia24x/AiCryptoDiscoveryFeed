/**
 * Content sources for Ai Crypto Discovery.
 *
 * Each source is an RSS / Atom / JSON feed URL plus metadata used for
 * filtering, badges, and the "Source list" section.
 *
 * Categories:
 *   - crypto     → ارز دیجیتال / DeFi / وب ۳
 *   - ai         → هوش مصنوعی / مدل‌های زبانی
 *   - tech       → فناوری / سخت‌افزار / نرم‌افزار
 *   - gaming     → بازی‌های ویدیویی / کنسول / PC
 *   - future     → آینده‌نگری / آینده‌شناسی
 *
 * NOTE: Telegram channel & Twitter handles are listed as curated cards
 * surfaced in the "Channels" section. Telegram provides public preview
 * embeds; Twitter embeds are not available client-side without API,
 * so we surface them as "Follow" cards instead.
 */

export type Category = "crypto" | "ai" | "tech" | "gaming" | "future" | "all";

export interface Source {
  id: string;
  name: string;
  nameFa: string;
  url: string;       // homepage
  feed: string;      // RSS / Atom / JSON feed URL
  category: Exclude<Category, "all">;
  language: "fa" | "en";
  /** Optional emoji / icon name (lucide-react) for badge */
  icon?: string;
}

export const SOURCES: Source[] = [
  // ===== Crypto =====
  {
    id: "coindesk",
    name: "CoinDesk",
    nameFa: "کوین‌دسک",
    url: "https://www.coindesk.com",
    feed: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    category: "crypto",
    language: "en",
    icon: "bitcoin",
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    nameFa: "کوین‌تلگراف",
    url: "https://cointelegraph.com",
    feed: "https://cointelegraph.com/rss",
    category: "crypto",
    language: "en",
    icon: "newspaper",
  },
  {
    id: "decrypt",
    name: "Decrypt",
    nameFa: "دی‌کریپت",
    url: "https://decrypt.co",
    feed: "https://decrypt.co/feed",
    category: "crypto",
    language: "en",
    icon: "key-round",
  },
  {
    id: "bitcoinmagazine",
    name: "Bitcoin Magazine",
    nameFa: "بیت‌کوین مجله",
    url: "https://bitcoinmagazine.com",
    feed: "https://bitcoinmagazine.com/.rss/full",
    category: "crypto",
    language: "en",
    icon: "bitcoin",
  },
  {
    id: "thedefiant",
    name: "The Defiant",
    nameFa: "دی‌فاینت",
    url: "https://thedefiant.io",
    feed: "https://thedefiant.io/api/feed/rss.xml",
    category: "crypto",
    language: "en",
    icon: "landmark",
  },

  // ===== AI =====
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    nameFa: "تک‌کرانچ هوش مصنوعی",
    url: "https://techcrunch.com/category/artificial-intelligence/",
    feed: "https://techcrunch.com/category/artificial-intelligence/feed/",
    category: "ai",
    language: "en",
    icon: "brain-circuit",
  },
  {
    id: "venturebeat-ai",
    name: "VentureBeat AI",
    nameFa: "ونچر-بیت هوش مصنوعی",
    url: "https://venturebeat.com/category/ai/",
    feed: "https://venturebeat.com/category/ai/feed/",
    category: "ai",
    language: "en",
    icon: "cpu",
  },
  {
    id: "theverge-ai",
    name: "The Verge AI",
    nameFa: "دی‌ورج هوش مصنوعی",
    url: "https://www.theverge.com/ai-artificial-intelligence",
    feed: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    category: "ai",
    language: "en",
    icon: "sparkles",
  },
  {
    id: "openai-blog",
    name: "OpenAI Blog",
    nameFa: "وبلاگ OpenAI",
    url: "https://openai.com/blog",
    feed: "https://openai.com/news/rss.xml",
    category: "ai",
    language: "en",
    icon: "sparkles",
  },

  // ===== Tech =====
  {
    id: "ars-technica",
    name: "Ars Technica",
    nameFa: "آرس تکنیکا",
    url: "https://arstechnica.com",
    feed: "https://feeds.arstechnica.com/arstechnica/index",
    category: "tech",
    language: "en",
    icon: "microchip",
  },
  {
    id: "engadget",
    name: "Engadget",
    nameFa: "انگجت",
    url: "https://www.engadget.com",
    feed: "https://www.engadget.com/rss.xml",
    category: "tech",
    language: "en",
    icon: "smartphone",
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    nameFa: "تک‌کرانچ",
    url: "https://techcrunch.com",
    feed: "https://techcrunch.com/feed/",
    category: "tech",
    language: "en",
    icon: "rocket",
  },

  // ===== Gaming =====
  {
    id: "ign",
    name: "IGN",
    nameFa: "آی‌جی‌ان",
    url: "https://www.ign.com",
    feed: "https://feeds.ign.com/ign/all",
    category: "gaming",
    language: "en",
    icon: "gamepad-2",
  },
  {
    id: "polygon",
    name: "Polygon",
    nameFa: "پالیگان",
    url: "https://www.polygon.com",
    feed: "https://www.polygon.com/rss/index.xml",
    category: "gaming",
    language: "en",
    icon: "gamepad-2",
  },
  {
    id: "kotaku",
    name: "Kotaku",
    nameFa: "کوتاکو",
    url: "https://kotaku.com",
    feed: "https://kotaku.com/rss",
    category: "gaming",
    language: "en",
    icon: "joystick",
  },
  {
    id: "rockpapershotgun",
    name: "Rock Paper Shotgun",
    nameFa: "راک-پیپر-شاتگان",
    url: "https://www.rockpapershotgun.com",
    feed: "https://www.rockpapershotgun.com/feed",
    category: "gaming",
    language: "en",
    icon: "gamepad-2",
  },

  // ===== Future =====
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    nameFa: "بررسی فناوری MIT",
    url: "https://www.technologyreview.com",
    feed: "https://www.technologyreview.com/feed/",
    category: "future",
    language: "en",
    icon: "telescope",
  },
  {
    id: "wired-science",
    name: "WIRED Science",
    nameFa: "وایرد علوم",
    url: "https://www.wired.com/tag/science/",
    feed: "https://www.wired.com/feed/tag/science/latest/rss",
    category: "future",
    language: "en",
    icon: "atom",
  },
];

/**
 * Curated Telegram channels (Persian-friendly crypto / AI / tech scene).
 * Surfaced as "Follow" cards with `t.me/<handle>/preview` iframe embed.
 */
export const TELEGRAM_CHANNELS: {
  id: string;
  handle: string;
  name: string;
  nameFa: string;
  category: Exclude<Category, "all">;
  description: string;
}[] = [
  {
    id: "tg-crypto",
    handle: "crypto",
    name: "Crypto",
    nameFa: "کریپتو",
    category: "crypto",
    description: "اخبار لحظه‌ای بازار ارزهای دیجیتال",
  },
  {
    id: "tg-airdrop",
    handle: "airdrop_com",
    name: "Airdrop",
    nameFa: "ایردراپ",
    category: "crypto",
    description: "معرفی ایردراپ‌های معتبر و استراتژی‌های شرکت",
  },
  {
    id: "tg-ai-news",
    handle: "ai_news",
    name: "AI News",
    nameFa: "اخبار هوش مصنوعی",
    category: "ai",
    description: "آخرین اخبار مدل‌های زبانی و هوش مصنوعی",
  },
  {
    id: "tg-tech",
    handle: "tech_news",
    name: "Tech News",
    nameFa: "اخبار فناوری",
    category: "tech",
    description: "اخبار فناوری روز دنیه به فارسی",
  },
];

/**
 * Curated Twitter / X accounts. Surfaced as "Follow" cards.
 */
export const TWITTER_ACCOUNTS: {
  id: string;
  handle: string;
  name: string;
  nameFa: string;
  category: Exclude<Category, "all">;
}[] = [
  { id: "x-vitalik", handle: "VitalikButerin", name: "Vitalik Buterin", nameFa: "وایتالیک بوترین", category: "crypto" },
  { id: "x-cz", handle: "cz_binance", name: "CZ 🔶 BNB", nameFa: "مدیرعامل سابق بایننس", category: "crypto" },
  { id: "x-balaji", handle: "balajis", name: "Balaji", nameFa: "بالاجی سرینیواسان", category: "future" },
  { id: "x-sama", handle: "sama", name: "Sam Altman", nameFa: "سم آلتمن", category: "ai" },
  { id: "x-karpathy", handle: "karpathy", name: "Andrej Karpathy", nameFa: "آندریج کارپاتی", category: "ai" },
  { id: "x-ylecun", handle: "ylecun", name: "Yann LeCun", nameFa: "یان لکون", category: "ai" },
  { id: "x-geoffrey", handle: "geoffreyhinton", name: "Geoffrey Hinton", nameFa: "جفری هینتون", category: "ai" },
  { id: "x-ign", handle: "IGN", name: "IGN", nameFa: "آی‌جی‌ان", category: "gaming" },
];

export const CATEGORY_META: Record<
  Exclude<Category, "all">,
  { label: string; labelEn: string; icon: string; tint: string; description: string }
> = {
  crypto: {
    label: "ارز دیجیتال",
    labelEn: "Crypto",
    icon: "bitcoin",
    tint: "#f7931a",
    description: "بیت‌کوین، اتریوم، DeFi، NFT و وب ۳",
  },
  ai: {
    label: "هوش مصنوعی",
    labelEn: "AI",
    icon: "brain-circuit",
    tint: "#2dd4bf",
    description: "مدل‌های زبانی، تولید تصویر و عامل‌های هوشمند",
  },
  tech: {
    label: "فناوری",
    labelEn: "Tech",
    icon: "cpu",
    tint: "#38bdf8",
    description: "سخت‌افزار، نرم‌افزار، اینترنت و امنیت",
  },
  gaming: {
    label: "بازی ویدیویی",
    labelEn: "Gaming",
    icon: "gamepad-2",
    tint: "#a78bfa",
    description: "کنسول، PC، موبایل و ای‌اسپورت",
  },
  future: {
    label: "آینده‌نگری",
    labelEn: "Future",
    icon: "telescope",
    tint: "#f59e0b",
    description: "آینده‌شناسی، علم و تکنولوژی‌های نوظهور",
  },
};
