import { NextResponse } from "next/server";
import { ANIMATE_BOOK_SCENE_PY, ANIMATE_SCENE_PY } from "@/lib/animate-scene";
import { loadDesk, loadPriceHistory } from "@/lib/investo-ro.server";
import { bookValueSeries } from "@/lib/share-chart";
import { parseBookShare } from "@/lib/share-image";
import type { PriceTick } from "@/lib/types";
import { zipStore } from "@/lib/zip-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isoDate(t: number): string {
  const stamp = new Date(t);
  if (Number.isNaN(stamp.getTime())) return "";
  return stamp.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  if (!ticker) {
    return NextResponse.json({ error: "Need ticker." }, { status: 400 });
  }

  const desk = await loadDesk();
  const value = desk.valuations[ticker];
  if (!value) {
    return NextResponse.json({ error: "No valuation." }, { status: 404 });
  }
  const quote = desk.names.find((row) => row.ticker === ticker);
  const series = await loadPriceHistory(ticker);
  const data = {
    ticker,
    name: quote?.name ?? ticker,
    last: value.last,
    intrinsic: value.intrinsic,
    upsidePct: value.upsidePct,
    modelLabel: value.modelLabel,
    asOf: value.asOf,
    prices: series
      .map((row) => ({ date: isoDate(row.t), close: row.p }))
      .filter((row) => row.date && Number.isFinite(row.close)),
  };

  const body = zipStore([
    { name: "data.json", body: `${JSON.stringify(data, null, 2)}\n` },
    { name: "scene.py", body: ANIMATE_SCENE_PY },
  ]);
  const file = `${ticker.replace(/[^A-Z0-9.]/g, "") || "company"}.zip`;
  return zipResponse(body, file);
}

async function historiesFor(tickers: string[]): Promise<Record<string, PriceTick[]>> {
  const unique = [...new Set(tickers)];
  const entries = await Promise.all(
    unique.map(async (ticker) => [ticker, await loadPriceHistory(ticker)] as const),
  );
  return Object.fromEntries(entries);
}

function zipResponse(body: Uint8Array, file: string) {
  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const book = parseBookShare(await request.json().catch(() => null));
  if (!book) {
    return NextResponse.json({ error: "Need a book payload." }, { status: 400 });
  }
  const histories = await historiesFor(book.lots.map((lot) => lot.ticker));
  const series = bookValueSeries(book.lots, histories);
  const data = {
    value: book.value,
    cost: book.cost,
    pnl: book.pnl,
    pnlPct: book.pnlPct,
    dayPct: book.dayPct,
    names: book.names,
    top: book.top,
    prices: series
      .map((row) => ({ date: isoDate(row.t), close: row.p }))
      .filter((row) => row.date && Number.isFinite(row.close)),
  };
  const body = zipStore([
    { name: "data.json", body: `${JSON.stringify(data, null, 2)}\n` },
    { name: "scene.py", body: ANIMATE_BOOK_SCENE_PY },
  ]);
  return zipResponse(body, "book.zip");
}
