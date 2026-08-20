import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Ai Crypto Discovery API",
    version: "1.1.0",
    endpoints: {
      content: [
        "GET /api/feed?category=all&q=&source=&lang=&limit=80",
        "GET /api/article?url=<article-url>",
        "GET /api/channel?handle=<telegram-handle>",
        "GET /api/og-image?url=<page-url>",
        "GET /api/prices",
      ],
      market: [
        "GET /api/market/binance-ticker",
        "GET /api/market/cmc-listings?limit=100",
        "GET /api/market/cmc-global",
        "GET /api/market/cmc-coin?slug=<coin-slug>",
        "GET /api/market/cmc-categories",
        "GET /api/market/coingecko-markets?per_page=100",
        "GET /api/market/coingecko-coin?id=<coin-id>",
        "GET /api/market/global-stats",
        "GET /api/market/top-gainers?limit=10",
        "GET /api/market/trending",
        "GET /api/market/fear-greed",
        "GET /api/market/fear-greed-historical?days=30",
      ],
      weather: [
        "GET /api/weather?lat=<lat>&lon=<lon>",
        "GET /api/weather/geocode?q=<city-name>",
      ],
      health: [
        "GET /api (this endpoint)",
      ],
    },
    totalRoutes: 21,
    cache: "Edge-cached with s-maxage + stale-while-revalidate",
    rateLimitNote: "CoinGecko free tier: 30 calls/min. CMC is primary for /api/prices.",
  });
}
