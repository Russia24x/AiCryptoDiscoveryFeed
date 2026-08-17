import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    name: "Ai Crypto Discovery API",
    version: "1.0.0",
    endpoints: [
      "/api/feed",
      "/api/article",
      "/api/channel",
      "/api/og-image",
      "/api/prices",
    ],
  });
}
