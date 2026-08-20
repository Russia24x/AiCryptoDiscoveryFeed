/**
 * Bilingual translations for Ai Crypto Discovery.
 *
 * Each key has a `fa` (Persian, RTL) and `en` (English, LTR) value.
 * The `useLanguage()` hook in `src/hooks/use-language.ts` reads the
 * active language from Zustand state + localStorage and exposes a
 * `t()` helper that returns the right string.
 *
 * Convention:
 *  - Persian strings should use Persian digits where appropriate (use
 *    `.toLocaleString("fa-IR")` for numbers, don't hardcode them here).
 *  - English strings are kept short for compact layouts.
 *  - Keys are dot-cased: `section.element` or `section.element.variant`.
 */

export type Language = "fa" | "en";

export interface TranslationKeys {
  // Layout direction per language
  dir: "rtl" | "ltr";

  // Brand
  brand: {
    tagline: string;
  };

  // Header / nav
  nav: {
    home: string;
    crypto: string;
    ai: string;
    tech: string;
    gaming: string;
    entertainment: string;
    space: string;
    social: string;
    search: string;
    searchPlaceholder: string;
    bookmarks: string;
    menu: string;
    language: string;
  };

  // Ticker (price ticker)
  ticker: {
    live: string;
    loading: string;
  };

  // Hero
  hero: {
    badge: string;
    titlePart1: string;
    titleAccent: string;
    titlePart2: string;
    description: string;
    statLiveItems: string;
    statActiveSources: string;
    statCategories: string;
    cta: string;
  };

  // Feed section
  feed: {
    feedLive: string;
    updated: string;
    searchResults: string;
    latestContent: string;
    allSources: string;
    clearFilter: string;
    refresh: string;
    gridView: string;
    listView: string;
    noResults: string;
    noResultsHint: string;
    empty: string;
    emptyHint: string;
    errorTitle: string;
    errorHint: string;
    retry: string;
    sourceFilter: string;
    scrollToSeeMore: string;
    minutesShort: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    monthsAgo: string;
    yearsAgo: string;
    savedAt: string;
  };

  // Article detail dialog
  detail: {
    readFull: string;
    tags: string;
    noPreview: string;
    closeDialog: string;
    bookmark: string;
    unbookmark: string;
    backToTop: string;
  };

  // Trending tags
  trending: {
    title: string;
    titleAccent: string;
    count: string;
  };

  // Future vision section
  futureVision: {
    badge: string;
    title: string;
    titleAccent: string;
    description: string;
    pillars: {
      tokenizedEconomy: { title: string; titleEn: string; text: string };
      agenticAI: { title: string; titleEn: string; text: string };
      edgeCompute: { title: string; titleEn: string; text: string };
      web3Gaming: { title: string; titleEn: string; text: string };
      foresight: { title: string; titleEn: string; text: string };
      convergence: { title: string; titleEn: string; text: string };
    };
  };

  // Channels section
  channels: {
    title: string;
    titleAccent: string;
    description: string;
    telegramTitle: string;
    twitterTitle: string;
    allCategories: string;
    allLanguages: string;
    persian: string;
    english: string;
    addChannel: string;
    addChannelTelegram: string;
    addChannelTwitter: string;
    addChannelSubmit: string;
    addChannelCancel: string;
    addChannelHandle: string;
    addChannelName: string;
    addChannelCategory: string;
    customChannels: string;
    removeChannel: string;
  };

  // Social portal (dedicated /social page)
  social: {
    title: string;
    titleAccent: string;
    description: string;
    badge: string;
    allSources: string;
    allCategories: string;
    telegramTab: string;
    twitterTab: string;
    allTab: string;
    refreshing: string;
    noPosts: string;
    noPostsHint: string;
    sourceFilter: string;
    selectChannel: string;
    selectChannelHint: string;
    postsCount: string;
    openOriginal: string;
    addChannelShort: string;
    searchChannels: string;
    lastUpdate: string;
  };

  // Footer
  footer: {
    tagline: string;
    status: string;
    categories: string;
    topSources: string;
    copyright: string;
    hosting: string;
  };

  // Bookmarks drawer
  bookmarksDrawer: {
    title: string;
    empty: string;
    emptyHint: string;
    clearAll: string;
    confirmClear: string;
    savedAt: string;
    remove: string;
    openArticle: string;
  };

  // Generic
  common: {
    yes: string;
    no: string;
    cancel: string;
    save: string;
    delete: string;
    close: string;
    perPage: string;
  };
}

export const translations: Record<Language, TranslationKeys> = {
  // ============================================================
  // PERSIAN (FA) — RTL
  // ============================================================
  fa: {
    dir: "rtl",
    brand: {
      tagline: "Future · Data · Intelligence",
    },
    nav: {
      home: "خانه",
      crypto: "ارز دیجیتال",
      ai: "هوش مصنوعی",
      tech: "فناوری",
      gaming: "بازی",
      entertainment: "سرگرمی",
      space: "فضا",
      social: "شبکه‌ها",
      search: "جستجو",
      searchPlaceholder: "جستجو…",
      bookmarks: "نشانک‌ها",
      menu: "منو",
      language: "زبان",
    },
    ticker: {
      live: "زنده",
      loading: "در حال بارگذاری قیمت‌ها…",
    },
    hero: {
      badge: "Discovery Engine · Live",
      titlePart1: "آینده را ",
      titleAccent: "کشف کن",
      titlePart2: "، نه فقط دنبالش برو.",
      description:
        "یک پلتفرم داده‌محور برای گردآوری هوشمند محتوای ارز دیجیتال، هوش مصنوعی، فناوری و بازی‌های ویدیویی. منابع خبری، کانال‌های تلگرام و توییتر را در یک داشبورد مینیمال و خوانا متمرکز کنید — بدون دیتابیس، روی زیرساخت رایگان کلادفلر.",
      statLiveItems: "محتوای زنده",
      statActiveSources: "منابع فعال",
      statCategories: "حوزه تخصصی",
      cta: "مشاهده فید زنده",
    },
    feed: {
      feedLive: "Feed · Live",
      updated: "به‌روزرسانی",
      searchResults: "نتایج جستجو",
      latestContent: "آخرین محتواها",
      allSources: "همه منابع",
      clearFilter: "حذف فیلتر",
      refresh: "به‌روزرسانی",
      gridView: "نمای شبکه‌ای",
      listView: "نمای فهرستی",
      noResults: "نتیجه‌ای یافت نشد",
      noResultsHint: "عبارت دیگری را امتحان کنید یا فیلتر را تغییر دهید.",
      empty: "محتوایی در دسترس نیست",
      emptyHint: "لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.",
      errorTitle: "خطا در دریافت محتوا",
      errorHint:
        "ارتباط با منابع با مشکل مواجه شد. ممکن است محدودیت نرخ درخواست اعمال شده باشد.",
      retry: "تلاش مجدد",
      sourceFilter: "Source Filter",
      scrollToSeeMore: "→ برای دیدن همه منابع بکشید",
      minutesShort: "دقیقه",
      justNow: "همین حالا",
      minutesAgo: "دقیقه پیش",
      hoursAgo: "ساعت پیش",
      daysAgo: "روز پیش",
      monthsAgo: "ماه پیش",
      yearsAgo: "سال پیش",
      savedAt: "ذخیره",
    },
    detail: {
      readFull: "خواندن کامل",
      tags: "برچسب‌ها",
      noPreview: "بدون پیش‌نمایش",
      closeDialog: "بستن",
      bookmark: "افزودن به نشانک‌ها",
      unbookmark: "حذف از نشانک‌ها",
      backToTop: "بازگشت به بالا",
    },
    trending: {
      title: "برچسب‌های",
      titleAccent: "داغ",
      count: "tags",
    },
    futureVision: {
      badge: "Future Vision",
      title: "شش محور",
      titleAccent: "آینده‌نگرانه",
      description:
        "محتوای گردآوری‌شده روی Ai Crypto Discovery بر اساس این شش محور فیلتر و اولویت‌بندی می‌شود. این چارچوب تضمین می‌کند که هر محتوا به جای تکرار اخبار روزمره، به سمت درک روندهای ساختاری و آینده‌نگرانه حرکت کند.",
      pillars: {
        tokenizedEconomy: {
          title: "اقتصاد رمزنگاری‌شده",
          titleEn: "Tokenized Economy",
          text: "گذار از پول فیات به دارایی‌های رمزنگاری‌شده، قراردادهای هوشمند و مالکیت غیرمتمرکز داده‌ها. آینده‌ای که در آن هر دارایی قابل انتقال، روی زنجیره قابل اعتبارسنجی خواهد بود.",
        },
        agenticAI: {
          title: "هوش مصنوعی عامل‌محور",
          titleEn: "Agentic AI",
          text: "گذار از مدل‌های زبانی پاسخگو به عامل‌های خودمختار که وظایف چندمرحله‌ای را مستقل انجام می‌دهند. این عامل‌ها با یکدیگر و با ابزارهای خارجی مذاکره خواهند کرد.",
        },
        edgeCompute: {
          title: "رایانش لبه‌ای",
          titleEn: "Edge Compute",
          text: "پردازش داده نزدیک‌تر به کاربر نهایی. با ترکیب 5G و تراشه‌های تخصصی AI، تأخیر برنامه‌ها به زیر ۱۰ میلی‌ثانیه کاهش می‌یابد و تجربه‌های واقعیت افزوده قابل‌اعتماد می‌شوند.",
        },
        web3Gaming: {
          title: "بازی‌های تحت وب ۳",
          titleEn: "Web3 Gaming",
          text: "مالکیت واقعی آیتم‌های داخل بازی توسط بازیکن، اقتصادهای شفاف و بازی‌های کراس‌پلتفرم. آینده‌ای که در آن زمان صرف‌شده در بازی به دارایی تبدیل می‌شود.",
        },
        foresight: {
          title: "آینده‌شناسی سیستماتیک",
          titleEn: "Foresight",
          text: "تحلیل سناریوهای چندگانه برای ۱۰ تا ۲۰ سال آینده. تمرکز بر روندهای ضعیف اما با‌تأثیرگذاری بالا، نه فقط پیش‌بینی‌های خطی.",
        },
        convergence: {
          title: "همگرایی فناوری‌ها",
          titleEn: "Convergence",
          text: "نقطه‌ای که در آن هوش مصنوعی، رمزنگاری و رایانش لبه همگرا می‌شوند و محصولاتی ایجاد می‌کنند که امروز قابل تصور نیستند — مثل عامل‌های مالی خودکار روی زنجیره.",
        },
      },
    },
    channels: {
      title: "بازتاب",
      titleAccent: "شبکه‌ها",
      description:
        "کانال‌های تلگرام و اکانت‌های توییتر منتخب در حوزه‌های تخصصی پلتفرم. می‌توانید فیلتر کنید تا فقط دسته یا زبان خاص را ببینید.",
      telegramTitle: "Telegram Channels",
      twitterTitle: "X / Twitter",
      allCategories: "همه دسته‌ها",
      allLanguages: "هر دو زبان",
      persian: "فارسی",
      english: "English",
      addChannel: "افزودن منبع دلخواه",
      addChannelTelegram: "افزودن کانال تلگرام",
      addChannelTwitter: "افزودن اکانت ایکس",
      addChannelSubmit: "افزودن",
      addChannelCancel: "انصراف",
      addChannelHandle: "آیدی کانال (مثلاً Mastersharkcrypto)",
      addChannelName: "نام نمایشی (اختیاری)",
      addChannelCategory: "دسته",
      customChannels: "منابع دلخواه شما",
      removeChannel: "حذف",
    },
    social: {
      title: "مرکز",
      titleAccent: "شبکه‌های اجتماعی",
      description:
        "بازتاب کامل پست‌های کانال‌های تلگرام و اکانت‌های ایکس منتخب. محتوای زنده، فیلتر دسته‌بندی، و جستجوی کانال — همه در یک صفحه اختصاصی.",
      badge: "Live · Social",
      allSources: "همه منابع",
      allCategories: "همه دسته‌ها",
      telegramTab: "تلگرام",
      twitterTab: "ایکس / توییتر",
      allTab: "همه",
      refreshing: "در حال به‌روزرسانی…",
      noPosts: "پستی یافت نشد",
      noPostsHint: "کانال ممکن است خصوصی باشد یا پیش‌نمایش عمومی نداشته باشد",
      sourceFilter: "فیلتر منبع",
      selectChannel: "یک کانال انتخاب کنید",
      selectChannelHint: "برای دیدن پست‌های کامل، روی یکی از کانال‌های زیر بزنید",
      postsCount: "پست",
      openOriginal: "باز کردن در منبع",
      addChannelShort: "افزودن کانال",
      searchChannels: "جستجوی کانال…",
      lastUpdate: "آخرین به‌روزرسانی",
    },
    footer: {
      tagline: "Future · Data · Intelligence",
      status: "Live · No-DB · Cloudflare-ready",
      categories: "Categories",
      topSources: "Top Sources",
      copyright: "© %s Ai Crypto Discovery — Built for the decentralized web.",
      hosting: "Hosted on Cloudflare · Next.js · No database",
    },
    bookmarksDrawer: {
      title: "نشانک‌ها",
      empty: "هنوز نشانکی ذخیره نکرده‌اید",
      emptyHint: "روی آیکن نشانک هر مقاله بزنید تا اینجا ذخیره شود.",
      clearAll: "پاک کردن همه",
      confirmClear: "مطمئنی؟",
      savedAt: "ذخیره",
      remove: "حذف",
      openArticle: "باز کردن مقاله",
    },
    common: {
      yes: "بله",
      no: "خیر",
      cancel: "انصراف",
      save: "ذخیره",
      delete: "حذف",
      close: "بستن",
      perPage: "در هر صفحه",
    },
  },

  // ============================================================
  // ENGLISH (EN) — LTR
  // ============================================================
  en: {
    dir: "ltr",
    brand: {
      tagline: "Future · Data · Intelligence",
    },
    nav: {
      home: "Home",
      crypto: "Crypto",
      ai: "AI",
      tech: "Tech",
      gaming: "Gaming",
      entertainment: "Entertainment",
      space: "Space",
      social: "Social",
      search: "Search",
      searchPlaceholder: "Search…",
      bookmarks: "Bookmarks",
      menu: "Menu",
      language: "Language",
    },
    ticker: {
      live: "Live",
      loading: "Loading prices…",
    },
    hero: {
      badge: "Discovery Engine · Live",
      titlePart1: "Discover the ",
      titleAccent: "future",
      titlePart2: ", don't just follow it.",
      description:
        "A data-driven platform that intelligently aggregates content across crypto, AI, tech, and gaming. Bring together news feeds, Telegram channels, and X accounts in one minimal, readable dashboard — no database, on free Cloudflare infrastructure.",
      statLiveItems: "Live items",
      statActiveSources: "Active sources",
      statCategories: "Specialized fields",
      cta: "View live feed",
    },
    feed: {
      feedLive: "Feed · Live",
      updated: "updated",
      searchResults: "Search results",
      latestContent: "Latest content",
      allSources: "All sources",
      clearFilter: "Clear filter",
      refresh: "Refresh",
      gridView: "Grid view",
      listView: "List view",
      noResults: "No results found",
      noResultsHint: "Try a different query or change the filter.",
      empty: "No content available",
      emptyHint: "Please wait a moment and try again.",
      errorTitle: "Failed to load content",
      errorHint:
        "Connection to sources failed. Rate limits may have been applied.",
      retry: "Retry",
      sourceFilter: "Source Filter",
      scrollToSeeMore: "→ Scroll to see all sources",
      minutesShort: "min",
      justNow: "just now",
      minutesAgo: "min ago",
      hoursAgo: "h ago",
      daysAgo: "d ago",
      monthsAgo: "mo ago",
      yearsAgo: "y ago",
      savedAt: "saved",
    },
    detail: {
      readFull: "Read full article",
      tags: "Tags",
      noPreview: "no preview",
      closeDialog: "Close",
      bookmark: "Add to bookmarks",
      unbookmark: "Remove from bookmarks",
      backToTop: "Back to top",
    },
    trending: {
      title: "Trending",
      titleAccent: "tags",
      count: "tags",
    },
    futureVision: {
      badge: "Future Vision",
      title: "Six forward-looking",
      titleAccent: "pillars",
      description:
        "Content on Ai Crypto Discovery is filtered and prioritized along these six pillars. This framework ensures every piece of content pushes toward understanding structural and forward-looking trends, rather than just repeating daily news.",
      pillars: {
        tokenizedEconomy: {
          title: "Tokenized Economy",
          titleEn: "Tokenized Economy",
          text: "The transition from fiat money to tokenized assets, smart contracts, and decentralized data ownership. A future where every transferable asset is verifiable on-chain.",
        },
        agenticAI: {
          title: "Agentic AI",
          titleEn: "Agentic AI",
          text: "The shift from reactive language models to autonomous agents that perform multi-step tasks independently. These agents will negotiate with each other and with external tools.",
        },
        edgeCompute: {
          title: "Edge Compute",
          titleEn: "Edge Compute",
          text: "Processing data closer to the end user. Combined with 5G and specialized AI chips, app latency drops below 10 milliseconds — making augmented-reality experiences reliable.",
        },
        web3Gaming: {
          title: "Web3 Gaming",
          titleEn: "Web3 Gaming",
          text: "Real ownership of in-game items by players, transparent economies, and cross-platform games. A future where time spent in-game converts to assets.",
        },
        foresight: {
          title: "Systematic Foresight",
          titleEn: "Foresight",
          text: "Analysis of multiple scenarios for the next 10 to 20 years. Focused on weak signals with high impact, not just linear forecasts.",
        },
        convergence: {
          title: "Tech Convergence",
          titleEn: "Convergence",
          text: "The point where AI, cryptography, and edge computing converge — creating products unimaginable today, like autonomous financial agents on-chain.",
        },
      },
    },
    channels: {
      title: "Social",
      titleAccent: "Feed",
      description:
        "Selected Telegram channels and X accounts across the platform's specialized fields. Filter by category or language to narrow down.",
      telegramTitle: "Telegram Channels",
      twitterTitle: "X / Twitter",
      allCategories: "All categories",
      allLanguages: "Both languages",
      persian: "Persian",
      english: "English",
      addChannel: "Add custom source",
      addChannelTelegram: "Add Telegram channel",
      addChannelTwitter: "Add X account",
      addChannelSubmit: "Add",
      addChannelCancel: "Cancel",
      addChannelHandle: "Channel handle (e.g., Mastersharkcrypto)",
      addChannelName: "Display name (optional)",
      addChannelCategory: "Category",
      customChannels: "Your custom sources",
      removeChannel: "Remove",
    },
    social: {
      title: "Social",
      titleAccent: "Hub",
      description:
        "Full mirror of posts from selected Telegram channels and X accounts. Live content, category filter, and channel search — all on one dedicated page.",
      badge: "Live · Social",
      allSources: "All sources",
      allCategories: "All categories",
      telegramTab: "Telegram",
      twitterTab: "X / Twitter",
      allTab: "All",
      refreshing: "Refreshing…",
      noPosts: "No posts found",
      noPostsHint: "Channel may be private or have no public web preview",
      sourceFilter: "Source filter",
      selectChannel: "Select a channel",
      selectChannelHint: "Click one of the channels below to see its full posts",
      postsCount: "posts",
      openOriginal: "Open in source",
      addChannelShort: "Add channel",
      searchChannels: "Search channels…",
      lastUpdate: "Last update",
    },
    footer: {
      tagline: "Future · Data · Intelligence",
      status: "Live · No-DB · Cloudflare-ready",
      categories: "Categories",
      topSources: "Top Sources",
      copyright: "© %s Ai Crypto Discovery — Built for the decentralized web.",
      hosting: "Hosted on Cloudflare · Next.js · No database",
    },
    bookmarksDrawer: {
      title: "Bookmarks",
      empty: "No bookmarks yet",
      emptyHint: "Tap the bookmark icon on any article to save it here.",
      clearAll: "Clear all",
      confirmClear: "Sure?",
      savedAt: "saved",
      remove: "Remove",
      openArticle: "Open article",
    },
    common: {
      yes: "Yes",
      no: "No",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      close: "Close",
      perPage: "per page",
    },
  },
};
