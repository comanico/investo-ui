import { NextResponse } from "next/server";
import { loadCloseOn } from "@/lib/investo-ro.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = (url.searchParams.get("ticker") ?? "").trim().toUpperCase();
  const date = (url.searchParams.get("date") ?? "").trim();
  if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const close = await loadCloseOn(ticker, date);
  if (!close) return NextResponse.json({ error: "no_close" }, { status: 404 });
  return NextResponse.json(close);
}
