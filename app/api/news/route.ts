import { NextResponse } from "next/server";
import { loadTickerNames } from "@/lib/investo-ro.server";

export const dynamic = "force-dynamic";

type Hit = {
  id: string;
  ticker: string;
  headline: string;
  source: string;
  at: string;
  url?: string;
};

type ParsedItem = Omit<Hit, "ticker"> & { body?: string };

const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.bursa.ro/_rss/?t=pcaps", source: "Bursa" },
  { url: "https://www.bursa.ro/_rss/?t=tzs", source: "Bursa" },
  { url: "https://www.profit.ro/rss", source: "Profit.ro" },
  { url: "https://www.zf.ro/rss/", source: "Ziarul Financiar" },
  { url: "https://www.economica.net/feed", source: "Economica.net" },
];

const NAME_STOP = new Set([
  "BANCA",
  "BANK",
  "GROUPE",
  "GROUP",
  "HOLDING",
  "HOLDINGS",
  "COMPANY",
  "NATIONALA",
  "SOCIETATEA",
  "SOCIETATE",
  "ROMANIA",
  "ROMANIAN",
  "COMERCIALA",
  "INVESTMENT",
  "INVESTMENTS",
  "INDUSTRIES",
  "INDUSTRIE",
  "THE",
  "AND",
  "PLC",
]);

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseRss(xml: string, source: string): ParsedItem[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return items.slice(0, 50).map((block) => ({
    headline: tag(block, "title"),
    url: tag(block, "link") || tag(block, "id"),
    at: tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || new Date().toISOString(),
    source,
    body: tag(block, "description") || tag(block, "summary"),
    id: "",
  }));
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function needlesFor(name: string): string[] {
  const cleaned = name
    .replace(/\bS\.?\s*A\.?\b/gi, " ")
    .replace(/\bPLC\b/gi, " ")
    .replace(/[.,()/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const out: string[] = [];
  if (cleaned.length >= 6) out.push(cleaned);
  for (const part of cleaned.split(" ")) {
    const token = part.trim();
    if (token.length < 6) continue;
    if (NAME_STOP.has(fold(token))) continue;
    out.push(token);
  }
  return out;
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTickerToken(hay: string, ticker: string): boolean {
  const token = escapeRe(ticker);
  if (ticker.length >= 3) {
    return new RegExp(`(^|[^A-Z0-9])${token}([^A-Z0-9]|$)`).test(hay);
  }
  return (
    new RegExp(`\\(${token}\\)`).test(hay) ||
    new RegExp(`(^|[^A-Z0-9])\\$${token}([^A-Z0-9]|$)`).test(hay) ||
    new RegExp(`(^|[^A-Z0-9])${token}\\.(RO|BSE)([^A-Z0-9]|$)`).test(hay)
  );
}

function matchTicker(text: string, tickers: string[], names: Record<string, string>): string | null {
  const hay = fold(text);
  for (const ticker of tickers) {
    const name = names[ticker];
    if (!name) continue;
    for (const needle of needlesFor(name)) {
      const token = escapeRe(fold(needle));
      if (new RegExp(`(^|[^A-Z0-9])${token}([^A-Z0-9]|$)`).test(hay)) return ticker;
    }
  }
  for (const ticker of tickers) {
    if (hasTickerToken(hay, ticker)) return ticker;
  }
  return null;
}

async function pull(url: string, source: string): Promise<ParsedItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), source);
  } catch {
    return [];
  }
}

function googleUrl(tickers: string[], names: Record<string, string>): string {
  const query =
    tickers.length === 0 || tickers.length > 8
      ? `BVB OR "Bursa de Valori Bucuresti"`
      : tickers
          .map((ticker) => {
            const name = names[ticker]?.replace(/"/g, "") ?? "";
            return name ? `(${ticker} OR "${name}")` : ticker;
          })
          .join(" OR ");
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ro&gl=RO&ceid=RO:ro`;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function mixBySource(hits: Hit[], limit: number): Hit[] {
  const buckets = new Map<string, Hit[]>();
  for (const hit of hits) {
    const list = buckets.get(hit.source) ?? [];
    list.push(hit);
    buckets.set(hit.source, list);
  }
  const picked: Hit[] = [];
  const seen = new Set<string>();
  const round = Math.max(2, Math.ceil(limit / Math.max(1, buckets.size)));
  for (const list of buckets.values()) {
    for (const hit of list.slice(0, round)) {
      if (seen.has(hit.id)) continue;
      seen.add(hit.id);
      picked.push(hit);
    }
  }
  for (const hit of hits) {
    if (picked.length >= limit) break;
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    picked.push(hit);
  }
  picked.sort((a, b) => {
    const ta = Date.parse(a.at);
    const tb = Date.parse(b.at);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });
  return picked.slice(0, limit);
}

function pushHit(hits: Hit[], seen: Set<string>, item: ParsedItem, ticker: string) {
  const id = `${item.source}:${item.url || item.headline}`;
  if (seen.has(id)) return;
  seen.add(id);
  hits.push({
    id,
    ticker,
    headline: item.headline,
    source: item.source,
    at: item.at,
    url: item.url,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = (searchParams.get("tickers") ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const names = tickers.length ? await loadTickerNames() : {};

  const googleJobs =
    tickers.length > 0
      ? tickers.length > 8
        ? [{ group: tickers, url: googleUrl(tickers, names) }]
        : chunks(tickers, 4).map((group) => ({
            group,
            url: googleUrl(group, names),
          }))
      : [];

  const [rssBatches, ...googleBatches] = await Promise.all([
    Promise.all(FEEDS.map((feed) => pull(feed.url, feed.source))),
    ...googleJobs.map((job) => pull(job.url, "Google News")),
  ]);

  const seen = new Set<string>();
  const hits: Hit[] = [];

  for (const batch of rssBatches) {
    for (const item of batch) {
      if (!item.headline) continue;
      const matched = tickers.length
        ? matchTicker(`${item.headline} ${item.body ?? ""}`, tickers, names)
        : null;
      if (matched) pushHit(hits, seen, item, matched);
      else if (tickers.length !== 1) pushHit(hits, seen, item, "BVB");
    }
  }

  googleJobs.forEach((job, index) => {
    for (const item of googleBatches[index] ?? []) {
      if (!item.headline) continue;
      const matched = tickers.length
        ? matchTicker(`${item.headline} ${item.body ?? ""}`, tickers, names)
        : null;
      const ticker = matched ?? (tickers.length === 1 ? tickers[0] : "BVB");
      pushHit(hits, seen, item, ticker);
    }
  });

  hits.sort((a, b) => {
    const ta = Date.parse(a.at);
    const tb = Date.parse(b.at);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });

  const limit = Math.min(48, Math.max(12, tickers.length * 2 || 12));
  return NextResponse.json(mixBySource(hits, limit));
}
