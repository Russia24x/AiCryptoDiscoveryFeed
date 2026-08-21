import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/weather?lat=35.6892&lon=51.3890
 *
 * Returns current weather for a given lat/lon using the Open-Meteo API
 * (https://open-meteo.com — free, no API key required, ~10k calls/day).
 *
 * Response shape:
 *   {
 *     "temperature": 18.4,           // °C
 *     "apparentTemperature": 17.0,    // °C (feels like)
 *     "humidity": 32,                 // %
 *     "windSpeed": 4.2,               // km/h
 *     "windDirection": 230,           // degrees
 *     "weatherCode": 1,               // WMO code (see map below)
 *     "description": "Mainly clear",  // human-readable EN
 *     "descriptionFa": "نیمه‌صاف",    // human-readable FA
 *     "emoji": "🌤️",
 *     "isDay": true,
 *     "fetchedAt": "..."
 *   }
 *
 * Open-Meteo rate limit: 10,000 requests/day free (no key). With edge
 * caching at 10 min, we hit ~6 calls/hour per user — far below the cap.
 */

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  description: string;
  descriptionFa: string;
  emoji: string;
  isDay: boolean;
  fetchedAt: string;
}

const FETCH_TIMEOUT_MS = 8000;

/**
 * Map WMO weather code → {description, descriptionFa, emoji}.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 *
 * WMO codes:
 *   0   Clear sky
 *   1   Mainly clear
 *   2   Partly cloudy
 *   3   Overcast
 *   45  Fog
 *   48  Depositing rime fog
 *   51  Light drizzle
 *   53  Moderate drizzle
 *   55  Dense drizzle
 *   56  Light freezing drizzle
 *   57  Dense freezing drizzle
 *   61  Slight rain
 *   63  Moderate rain
 *   65  Heavy rain
 *   66  Light freezing rain
 *   67  Heavy freezing rain
 *   71  Slight snow
 *   73  Moderate snow
 *   75  Heavy snow
 *   77  Snow grains
 *   80  Slight rain showers
 *   81  Moderate rain showers
 *   82  Violent rain showers
 *   85  Slight snow showers
 *   86  Heavy snow showers
 *   95  Thunderstorm
 *   96  Thunderstorm with slight hail
 *   99  Thunderstorm with heavy hail
 */
const WMO: Record<number, { en: string; fa: string; emoji: string }> = {
  0:  { en: "Clear sky",       fa: "آسمان صاف",         emoji: "☀️" },
  1:  { en: "Mainly clear",    fa: "نیمه‌صاف",           emoji: "🌤️" },
  2:  { en: "Partly cloudy",   fa: "نیمه‌ابری",          emoji: "⛅" },
  3:  { en: "Overcast",        fa: "ابری",              emoji: "☁️" },
  45: { en: "Fog",             fa: "مه",                emoji: "🌫️" },
  48: { en: "Rime fog",       fa: "مه یخ‌زده",          emoji: "🌫️" },
  51: { en: "Light drizzle",   fa: "نم‌نمک سبک",         emoji: "🌦️" },
  53: { en: "Drizzle",         fa: "نم‌نمک",            emoji: "🌦️" },
  55: { en: "Dense drizzle",   fa: "نم‌نمک سنگین",       emoji: "🌦️" },
  56: { en: "Freezing drizzle", fa: "نم‌نمک یخ‌زده",     emoji: "🌧️" },
  57: { en: "Dense freezing drizzle", fa: "نم‌نمک یخ‌زده سنگین", emoji: "🌧️" },
  61: { en: "Slight rain",     fa: "باران سبک",         emoji: "🌦️" },
  63: { en: "Rain",            fa: "باران",             emoji: "🌧️" },
  65: { en: "Heavy rain",      fa: "باران سنگین",        emoji: "🌧️" },
  66: { en: "Freezing rain",   fa: "باران یخ‌زده",       emoji: "🌧️" },
  67: { en: "Heavy freezing rain", fa: "باران یخ‌زده سنگین", emoji: "🌧️" },
  71: { en: "Slight snow",    fa: "برف سبک",           emoji: "🌨️" },
  73: { en: "Snow",            fa: "برف",               emoji: "❄️" },
  75: { en: "Heavy snow",      fa: "برف سنگین",         emoji: "❄️" },
  77: { en: "Snow grains",     fa: "دانه‌های برف",       emoji: "🌨️" },
  80: { en: "Rain showers",    fa: "رگبار باران",        emoji: "🌦️" },
  81: { en: "Moderate showers", fa: "رگبار متوسط",     emoji: "🌧️" },
  82: { en: "Violent showers", fa: "رگبار شدید",        emoji: "⛈️" },
  85: { en: "Snow showers",    fa: "رگبار برف",         emoji: "🌨️" },
  86: { en: "Heavy snow showers", fa: "رگبار برف سنگین", emoji: "❄️" },
  95: { en: "Thunderstorm",    fa: "رعدوبرق",           emoji: "⛈️" },
  96: { en: "Thunderstorm + hail", fa: "رعدوبرق با تگرگ", emoji: "⛈️" },
  99: { en: "Severe thunderstorm", fa: "رعدوبرق شدید",  emoji: "🌩️" },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lon = parseFloat(searchParams.get("lon") || "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Missing or invalid 'lat' / 'lon' query parameters" },
      { status: 400 }
    );
  }

  // Clamp to valid range
  const clampedLat = Math.max(-90, Math.min(90, lat));
  const clampedLon = Math.max(-180, Math.min(180, lon));

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${clampedLat.toFixed(4)}` +
    `&longitude=${clampedLon.toFixed(4)}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m` +
    `&timezone=auto&forecast_days=1`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      const cur = json?.current;
      if (cur) {
        const code = Number(cur.weather_code ?? 0);
        const meta = WMO[code] || { en: "Unknown", fa: "نامشخص", emoji: "🌡️" };
        const data: WeatherData = {
          temperature: Number(cur.temperature_2m ?? 0),
          apparentTemperature: Number(cur.apparent_temperature ?? 0),
          humidity: Number(cur.relative_humidity_2m ?? 0),
          windSpeed: Number(cur.wind_speed_10m ?? 0),
          windDirection: Number(cur.wind_direction_10m ?? 0),
          weatherCode: code,
          description: meta.en,
          descriptionFa: meta.fa,
          emoji: meta.emoji,
          isDay: Boolean(cur.is_day),
          fetchedAt: new Date().toISOString(),
        };
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
          },
        });
      }
    }
    return NextResponse.json(
      { error: "Failed to fetch weather", fetchedAt: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Fetch failed",
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}

/** List of popular Iranian + major world cities for the settings dropdown. */
export const POPULAR_CITIES: Array<{
  id: string;
  name: string;
  nameFa: string;
  lat: number;
  lon: number;
  country: string;
  countryFa: string;
}> = [
  // Iran
  { id: "tehran",     name: "Tehran",      nameFa: "تهران",     lat: 35.6892,  lon: 51.3890,  country: "Iran", countryFa: "ایران" },
  { id: "mashhad",    name: "Mashhad",     nameFa: "مشهد",      lat: 36.2605,  lon: 59.6168,  country: "Iran", countryFa: "ایران" },
  { id: "isfahan",    name: "Isfahan",     nameFa: "اصفهان",    lat: 32.6539,  lon: 51.6660,  country: "Iran", countryFa: "ایران" },
  { id: "shiraz",     name: "Shiraz",      nameFa: "شیراز",     lat: 29.5918,  lon: 52.5837,  country: "Iran", countryFa: "ایران" },
  { id: "tabriz",     name: "Tabriz",      nameFa: "تبریز",     lat: 38.0800,  lon: 46.2919,  country: "Iran", countryFa: "ایران" },
  { id: "ahvaz",      name: "Ahvaz",       nameFa: "اهواز",     lat: 31.3183,  lon: 48.6706,  country: "Iran", countryFa: "ایران" },
  { id: "kermanshah", name: "Kermanshah",  nameFa: "کرمانشاه",   lat: 34.3142,  lon: 47.0650,  country: "Iran", countryFa: "ایران" },
  { id: "rasht",      name: "Rasht",       nameFa: "رشت",       lat: 37.2808,  lon: 49.5832,  country: "Iran", countryFa: "ایران" },
  { id: "kerman",     name: "Kerman",      nameFa: "کرمان",     lat: 30.2839,  lon: 57.0834,  country: "Iran", countryFa: "ایران" },
  // Regional / global
  { id: "dubai",      name: "Dubai",       nameFa: "دبی",       lat: 25.2048,  lon: 55.2708,  country: "UAE",  countryFa: "امارات" },
  { id: "istanbul",   name: "Istanbul",    nameFa: "استانبول",   lat: 41.0082,  lon: 28.9784,  country: "Turkey", countryFa: "ترکیه" },
  { id: "london",     name: "London",      nameFa: "لندن",      lat: 51.5074,  lon: -0.1278,  country: "UK",   countryFa: "انگلستان" },
  { id: "newyork",    name: "New York",    nameFa: "نیویورک",   lat: 40.7128,  lon: -74.0060, country: "USA",  countryFa: "آمریکا" },
  { id: "tokyo",      name: "Tokyo",       nameFa: "توکیو",      lat: 35.6762,  lon: 139.6503, country: "Japan", countryFa: "ژاپن" },
];
