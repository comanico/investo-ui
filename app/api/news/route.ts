import { NextResponse } from "next/server";
import { loadNewsHits } from "@/lib/news-feed.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const tickers = (new URL(request.url).searchParams.get("tickers") ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return NextResponse.json(await loadNewsHits(tickers));
}
