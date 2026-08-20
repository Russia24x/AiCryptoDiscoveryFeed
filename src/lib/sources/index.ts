/**
 * Content sources for Ai Crypto Discovery — bilingual (fa / en).
 *
 * Each source has a `language` field. When the active UI language is `fa`,
 * the API returns only Persian sources; when `en`, only English sources.
 * This way the user sees content in the language they selected.
 *
 * Categories:
 *   - crypto         → ارز دیجیتال / Crypto
 *   - ai              → هوش مصنوعی / AI
 *   - tech            → فناوری / Tech
 *   - gaming          → بازی‌های ویدیویی / Gaming
 *   - entertainment   → سرگرمی / Entertainment   ← (new, replaces 'future')
 *
 * Custom sources: users can add their own Telegram channels / X accounts
 * via the Channels section UI — these are stored in localStorage under
 * the key `acd:custom-channels`.
 */

export type Category =
  | "crypto"
  | "ai"
  | "tech"
  | "gaming"
  | "entertainment"
  | "space"
  | "all";

export type Language = "fa" | "en";

export interface Source {
  id: string;
  name: string;
  nameFa: string;
  url: string;       // homepage
  feed: string;      // RSS / Atom / JSON feed URL
  category: Exclude<Category, "all">;
  language: Language;
  /** Optional icon name (lucide-react) for badge */
  icon?: string;
  /**
   * Optional path filter — when set, only items whose `link` URL
   * contains this substring are shown. Used for sources like Zoomit
   * whose category-specific RSS endpoints return HTML instead of XML
   * (Zoomit migrated to a Next.js platform and broke /space/feed,
   * /ai-articles/feed, etc.). We fall back to the main feed and
   * filter client-side by URL path.
   *
   * Example: pathFilter: "/space/" keeps only links like
   * https://www.zoomit.ir/space/465646-nasa-images-reveal-...
   */
  pathFilter?: string;
}

export const SOURCES: Source[] = [
  // ================================================================
  // PERSIAN SOURCES (fa) — RSS feeds
  // ================================================================

  // ----- Crypto (ارزدیجیتال) -----
  {
    id: "arzdigital-breaking",
    name: "ArzDigital Breaking",
    nameFa: "آرزدیجیتال — اخبار فوری",
    url: "https://arzdigital.com/breaking/",
    feed: "https://arzdigital.com/breaking/feed/",
    category: "crypto",
    language: "fa",
    icon: "bitcoin",
  },
  {
    id: "mihanblockchain-news",
    name: "MihanBlockchain News",
    nameFa: "میهن بلاکچین — اخبار",
    url: "https://mihanblockchain.com/category/news/",
    feed: "https://mihanblockchain.com/category/news/feed/",
    category: "crypto",
    language: "fa",
    icon: "newspaper",
  },
  {
    id: "mihanblockchain-learn",
    name: "MihanBlockchain Learn",
    nameFa: "میهن بلاکچین — آموزش",
    url: "https://mihanblockchain.com/category/learn/",
    feed: "https://mihanblockchain.com/category/learn/feed/",
    category: "crypto",
    language: "fa",
    icon: "graduation-cap",
  },
  {
    id: "digiato-crypto",
    name: "Digiato Crypto",
    nameFa: "دیجیاتو — ارز دیجیتال",
    url: "https://digiato.com/topic/tech/cryptocurrency",
    feed: "https://digiato.com/topic/tech/cryptocurrency/feed/",
    category: "crypto",
    language: "fa",
    icon: "bitcoin",
  },

  // ----- AI (هوش مصنوعی) -----
  {
    id: "digiato-ai",
    name: "Digiato AI",
    nameFa: "دیجیاتو — هوش مصنوعی",
    url: "https://digiato.com/topic/tech/artificial-intelligence",
    feed: "https://digiato.com/topic/tech/artificial-intelligence/feed/",
    category: "ai",
    language: "fa",
    icon: "brain-circuit",
  },
  {
    id: "zoomit-main",
    name: "Zoomit AI",
    nameFa: "زومیت — هوش مصنوعی",
    url: "https://www.zoomit.ir/ai-articles",
    // Zoomit migrated to a Next.js platform and broke category-specific
    // RSS feeds (/ai-articles/feed returns HTML, not XML). We use the
    // main feed and filter client-side by URL path /ai-articles/.
    feed: "https://www.zoomit.ir/feed/",
    category: "ai",
    language: "fa",
    icon: "cpu",
    pathFilter: "/ai-articles/",
  },

  // ----- Tech (فناوری) -----
  {
    id: "digiato-tech",
    name: "Digiato Tech",
    nameFa: "دیجیاتو — فناوری",
    url: "https://digiato.com/topic/tech",
    feed: "https://digiato.com/topic/tech/feed/",
    category: "tech",
    language: "fa",
    icon: "cpu",
  },
  {
    id: "sakhtafzarmag",
    name: "SakhtAfzarMag",
    nameFa: "سخت‌افزارمگ — اخبار و مقالات",
    url: "https://sakhtafzarmag.com/",
    feed: "https://sakhtafzarmag.com/feed/",
    category: "tech",
    language: "fa",
    icon: "newspaper",
  },

  // ----- Gaming (بازی) -----
  {
    id: "vigiato-game-reviews",
    name: "Vigiato Game Reviews",
    nameFa: "ویجیاتو — نقد بازی",
    url: "https://vigiato.net/c/game-reviews",
    feed: "https://vigiato.net/c/game-reviews/feed",
    category: "gaming",
    language: "fa",
    icon: "gamepad-2",
  },
  {
    id: "gamefa-game-news",
    name: "GameFa Game News",
    nameFa: "گیم‌فا — اخبار بازی",
    url: "https://gamefa.com/category/game/news/",
    feed: "https://gamefa.com/category/game/news/feed/",
    category: "gaming",
    language: "fa",
    icon: "gamepad-2",
  },

  // ----- Entertainment (سرگرمی) -----
  {
    id: "gamefa-cinema",
    name: "GameFa Cinema News",
    nameFa: "گیم‌فا — اخبار سینما",
    url: "https://gamefa.com/category/cinema/cinema-news/",
    feed: "https://gamefa.com/category/cinema/cinema-news/feed/",
    category: "entertainment",
    language: "fa",
    icon: "film",
  },
  {
    id: "vigiato-cinema-tv",
    name: "Vigiato Cinema & TV",
    nameFa: "ویجیاتو — سینما و تلویزیون",
    url: "https://vigiato.net/c/cinema-tv",
    feed: "https://vigiato.net/c/cinema-tv/feed",
    category: "entertainment",
    language: "fa",
    icon: "film",
  },
  {
    id: "vigiato-entertainment",
    name: "Vigiato Entertainment",
    nameFa: "ویجیاتو — سرگرمی",
    url: "https://vigiato.net/c/entertainment",
    feed: "https://vigiato.net/c/entertainment/feed",
    category: "entertainment",
    language: "fa",
    icon: "sparkles",
  },

  // ----- Space (فضا) — Persian -----
  {
    id: "zoomit-space",
    name: "Zoomit Space",
    nameFa: "زومیت — فضا",
    url: "https://www.zoomit.ir/space/",
    // Zoomit's /space/feed returns HTML (Next.js platform migration broke
    // category RSS). We use the main feed and filter client-side by URL
    // path /space/ — about 10% of Zoomit articles are space-related.
    feed: "https://www.zoomit.ir/feed/",
    category: "space",
    language: "fa",
    icon: "rocket",
    pathFilter: "/space/",
  },

  // ================================================================
  // ENGLISH SOURCES (en) — RSS feeds
  // ================================================================

  // ----- Crypto -----
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
    id: "newsbitcoin",
    name: "Bitcoin.com News",
    nameFa: "بیت‌کوین دات کام",
    url: "https://news.bitcoin.com",
    feed: "https://news.bitcoin.com/feed/",
    category: "crypto",
    language: "en",
    icon: "bitcoin",
  },
  {
    id: "beincrypto",
    name: "BeInCrypto",
    nameFa: "بی‌این‌کریپتو",
    url: "https://beincrypto.com",
    feed: "https://beincrypto.com/feed/",
    category: "crypto",
    language: "en",
    icon: "bitcoin",
  },

  // ----- AI -----
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

  // ----- Tech -----
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

  // ----- Gaming -----
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

  // ----- Entertainment -----
  {
    id: "variety",
    name: "Variety",
    nameFa: "ورایتی",
    url: "https://variety.com",
    feed: "https://variety.com/feed/",
    category: "entertainment",
    language: "en",
    icon: "film",
  },
  {
    id: "hollywood-reporter",
    name: "The Hollywood Reporter",
    nameFa: "هالیوود ریپورتر",
    url: "https://www.hollywoodreporter.com",
    feed: "https://www.hollywoodreporter.com/feed/",
    category: "entertainment",
    language: "en",
    icon: "film",
  },

  // ----- Space (فضا) — English -----
  {
    id: "space-com",
    name: "Space.com",
    nameFa: "اسپیس دات کام",
    url: "https://www.space.com",
    feed: "https://www.space.com/feeds/all",
    category: "space",
    language: "en",
    icon: "rocket",
  },
  {
    id: "nasa-news",
    name: "NASA News",
    nameFa: "ناسا — اخبار",
    url: "https://www.nasa.gov",
    feed: "https://www.nasa.gov/news-release/feed/",
    category: "space",
    language: "en",
    icon: "rocket",
  },
];

/**
 * Built-in Telegram channels — bilingual per category.
 * Users can also add their own via the Channels UI (stored in localStorage).
 */
export interface TelegramChannel {
  id: string;
  handle: string;            // e.g. "Mastersharkcrypto"
  name: string;
  nameFa: string;
  category: Exclude<Category, "all">;
  language: Language;
  description: string;
  descriptionFa?: string;
  isCustom?: boolean;
}

export const TELEGRAM_CHANNELS: TelegramChannel[] = [
  // Persian
  {
    id: "tg-mastersharkcrypto",
    handle: "Mastersharkcrypto",
    name: "MasterSharkCrypto",
    nameFa: "مستر شارک کریپتو",
    category: "crypto",
    language: "fa",
    description: "تحلیل و اخبار لحظه‌ای بازار ارزهای دیجیتال",
    descriptionFa: "تحلیل و اخبار لحظه‌ای بازار ارزهای دیجیتال",
  },
  {
    id: "tg-smartainewss",
    handle: "smartainewss",
    name: "Smart AI News",
    nameFa: "اخبار هوش مصنوعی",
    category: "ai",
    language: "fa",
    description: "آخرین اخبار مدل‌های زبانی و هوش مصنوعی",
    descriptionFa: "آخرین اخبار مدل‌های زبانی و هوش مصنوعی",
  },
  // English (kept for English-language mode)
  {
    id: "tg-crypto",
    handle: "crypto",
    name: "Crypto",
    nameFa: "کریپتو",
    category: "crypto",
    language: "en",
    description: "Live crypto market news",
    descriptionFa: "اخبار لحظه‌ای بازار ارزهای دیجیتال",
  },
  // NOTE: tg-ai-news (handle: ai_news) was REMOVED — its preview returned no content
  // (channel has no public web preview). Replaced by smartainewss for the AI category
  // in Persian mode, and English users can use the X/Twitter accounts instead.
];

export interface TwitterAccount {
  id: string;
  handle: string;
  name: string;
  nameFa: string;
  category: Exclude<Category, "all">;
  language: Language;
  isCustom?: boolean;
}

export const TWITTER_ACCOUNTS: TwitterAccount[] = [
  // English (no Persian X accounts in spec)
  { id: "x-vitalik", handle: "VitalikButerin", name: "Vitalik Buterin", nameFa: "وایتالیک بوترین", category: "crypto", language: "en" },
  { id: "x-cz", handle: "cz_binance", name: "CZ 🔶 BNB", nameFa: "مدیرعامل سابق بایننس", category: "crypto", language: "en" },
  { id: "x-balaji", handle: "balajis", name: "Balaji", nameFa: "بالاجی سرینیواسان", category: "crypto", language: "en" },
  { id: "x-sama", handle: "sama", name: "Sam Altman", nameFa: "سم آلتمن", category: "ai", language: "en" },
  { id: "x-karpathy", handle: "karpathy", name: "Andrej Karpathy", nameFa: "آندریج کارپاتی", category: "ai", language: "en" },
  { id: "x-ylecun", handle: "ylecun", name: "Yann LeCun", nameFa: "یان لکون", category: "ai", language: "en" },
  { id: "x-ign", handle: "IGN", name: "IGN", nameFa: "آی‌جی‌ان", category: "gaming", language: "en" },
  { id: "x-variety", handle: "Variety", name: "Variety", nameFa: "ورایتی", category: "entertainment", language: "en" },
];

export const CATEGORY_META: Record<
  Exclude<Category, "all">,
  {
    label: string;       // Persian label
    labelEn: string;     // English label
    icon: string;
    tint: string;
    description: string;
    descriptionEn: string;
  }
> = {
  crypto: {
    label: "ارز دیجیتال",
    labelEn: "Crypto",
    icon: "bitcoin",
    tint: "#f7931a",
    description: "بیت‌کوین، اتریوم، DeFi، NFT و وب ۳",
    descriptionEn: "Bitcoin, Ethereum, DeFi, NFT, and Web3",
  },
  ai: {
    label: "هوش مصنوعی",
    labelEn: "AI",
    icon: "brain-circuit",
    tint: "#2dd4bf",
    description: "مدل‌های زبانی، تولید تصویر و عامل‌های هوشمند",
    descriptionEn: "Language models, image generation, and intelligent agents",
  },
  tech: {
    label: "فناوری",
    labelEn: "Tech",
    icon: "cpu",
    tint: "#38bdf8",
    description: "سخت‌افزار، نرم‌افزار، اینترنت و امنیت",
    descriptionEn: "Hardware, software, internet, and security",
  },
  gaming: {
    label: "بازی ویدیویی",
    labelEn: "Gaming",
    icon: "gamepad-2",
    tint: "#a78bfa",
    description: "کنسول، PC، موبایل و ای‌اسپورت",
    descriptionEn: "Console, PC, mobile, and esports",
  },
  entertainment: {
    label: "سرگرمی",
    labelEn: "Entertainment",
    icon: "film",
    tint: "#f472b6",
    description: "سینما، تلویزیون، موسیقی و فرهنگ عامه",
    descriptionEn: "Cinema, TV, music, and pop culture",
  },
  space: {
    label: "فضا",
    labelEn: "Space",
    icon: "rocket",
    tint: "#e8e6e1",
    description: "نجوم، کاوشگرهای فضایی، سیارات و کهکشان‌ها",
    descriptionEn: "Astronomy, space probes, planets, and galaxies",
  },
};

/** Helper: get category label localized. */
export function categoryLabel(cat: Exclude<Category, "all">, lang: Language): string {
  return lang === "fa" ? CATEGORY_META[cat].label : CATEGORY_META[cat].labelEn;
}
