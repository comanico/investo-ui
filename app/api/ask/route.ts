import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateText } from "ai";
import { xai } from "@ai-sdk/xai";
import { NextResponse } from "next/server";
import { findDeskTicker } from "@/lib/ask";
import { loadDesk } from "@/lib/investo-ro.server";
import type { ValuationResult } from "@/lib/valuation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const askPrompt = await readFile(path.join(process.cwd(), "src/lib/ask.md"), "utf8");

function siteValuationBlock(
  ticker: string | null,
  name: string | undefined,
  value: ValuationResult | undefined,
): string {
  if (!ticker || !value) return "SITE VALUATION\nnone";
  return [
    "SITE VALUATION",
    `ticker: ${ticker}`,
    `name: ${name ?? ticker}`,
    `modelLabel: ${value.modelLabel}`,
    `intrinsic: ${value.intrinsic}`,
    `last: ${value.last}`,
    `upsidePct: ${value.upsidePct}`,
    `asOf: ${value.asOf}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { q?: unknown } | null;
  const q = typeof body?.q === "string" ? body.q.trim() : "";
  if (!q) return NextResponse.json({ answer: "" });

  const desk = await loadDesk();
  const ticker = findDeskTicker(q, desk.names);
  const quote = ticker ? desk.names.find((row) => row.ticker === ticker) : undefined;
  const value = ticker ? desk.valuations[ticker] : undefined;
  const system = `${askPrompt.trim()}\n\n${siteValuationBlock(ticker, quote?.name, value)}`;

  const { text } = await generateText({
    model: xai("grok-4.3"),
    system,
    prompt: q,
  });
  const reply = text.trim();
  if (reply === "OFF_TOPIC") {
    return NextResponse.json({ offTopic: true });
  }
  return NextResponse.json({ answer: reply, offTopic: false });
}
