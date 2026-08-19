import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/weather/geocode?q=bangkok
 *
 * Search for cities worldwide using the Open-Meteo Geocoding API.
 *
 * Returns up to 10 matches, each with:
 *   {
 *     "id": 1229434,
 *     "name": "Bangkok",
 *     "country": "Thailand",
 *     "countryCode": "TH",
 *     "admin1": "Bangkok",      // state/province
 *     "lat": 13.75398,
 *     "lon": 100.50144,
 *     "timezone": "Asia/Bangkok",
 *     "population": 5104476
 *   }
 *
 * Open-Meteo Geocoding API:
 *   - Endpoint: https://geocoding-api.open-meteo.com/v1/search
 *   - Free, no API key, 10k requests/day
 *   - Supports search in multiple languages (passed via `language` param)
 *
 * Caching: edge-cached 1 hour (cities don't move), stale-while-revalidate 1 day.
 */

const FETCH_TIMEOUT_MS = 8000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const language = (searchParams.get("language") || "en").trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing 'q' (query) parameter" },
      { status: 400 }
    );
  }

  // Limit query length to prevent abuse
  const query = q.slice(0, 100);

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const url =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
      `&count=10&language=${encodeURIComponent(language)}&format=json`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Geocoding API returned HTTP ${res.status}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    // Map to our normalized shape
    const cities = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      country: r.country || "",
      countryCode: r.country_code || "",
      admin1: r.admin1 || "", // state/province
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone || "",
      population: r.population || 0,
      // Display name: "Bangkok, Thailand" or "Tehran, Tehran, Iran"
      displayName: [r.name, r.admin1, r.country]
        .filter(Boolean)
        // Deduplicate (sometimes admin1 === name)
        .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
        .join(", "),
    }));

    return NextResponse.json(
      { cities, count: cities.length, query: q },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Fetch failed",
        cities: [],
        count: 0,
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
