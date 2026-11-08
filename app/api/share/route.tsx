import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { loadNewsHits } from "@/lib/news-feed.server";
import { loadDesk, loadPriceHistory } from "@/lib/investo-ro.server";
import { newsLines } from "@/lib/brief";
import { bookValueSeries } from "@/lib/share-chart";
import { BookShareCard, CompanyShareCard, parseBookShare } from "@/lib/share-image";
import type { PriceTick } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fontsDir = path.join(process.cwd(), "src/fonts");

async function shareFonts() {
  const [regular, semibold, bold, display] = await Promise.all([
    readFile(path.join(fontsDir, "IBMPlexSans-Regular.ttf")),
    readFile(path.join(fontsDir, "IBMPlexSans-SemiBold.ttf")),
    readFile(path.join(fontsDir, "IBMPlexSans-Bold.ttf")),
    readFile(path.join(fontsDir, "BigShouldersDisplay-ExtraBold.ttf")),
  ]);
  return [
    { name: "IBM Plex Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "IBM Plex Sans", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "IBM Plex Sans", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Big Shoulders Display", data: display, weight: 800 as const, style: "normal" as const },
  ];
}

async function png(element: ReactElement, filename: string) {
  const image = new ImageResponse(element, {
    width: 1080,
    height: 1080,
    fonts: await shareFonts(),
  });
  const body = await image.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function historiesFor(tickers: string[]): Promise<Record<string, PriceTick[]>> {
  const unique = [...new Set(tickers)];
  const entries = await Promise.all(
    unique.map(async (ticker) => [ticker, await loadPriceHistory(ticker)] as const),
  );
  return Object.fromEntries(entries);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const ticker = (url.searchParams.get("ticker") ?? "").trim().toUpperCase();
  if (kind !== "company" || !ticker) {
    return NextResponse.json({ error: "Need kind=company and ticker." }, { status: 400 });
  }

  const desk = await loadDesk();
  const value = desk.valuations[ticker];
  if (!value) {
    return NextResponse.json({ error: "No valuation." }, { status: 404 });
  }
  const quote = desk.names.find((row) => row.ticker === ticker);
  const name = quote?.name ?? ticker;
  const [series, hits] = await Promise.all([loadPriceHistory(ticker), loadNewsHits([ticker])]);
  const headlines = newsLines(hits);
  const file = `${ticker.replace(/[^A-Z0-9.]/g, "") || "company"}.png`;
  return png(<CompanyShareCard name={name} value={value} series={series} headlines={headlines} />, file);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const book = parseBookShare(body);
  if (!book) {
    return NextResponse.json({ error: "Need a book payload." }, { status: 400 });
  }
  const histories = await historiesFor(book.lots.map((lot) => lot.ticker));
  const series = bookValueSeries(book.lots, histories);
  return png(<BookShareCard book={book} series={series} />, "book.png");
}
