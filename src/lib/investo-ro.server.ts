import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env.server";
import type { NewsHit } from "./news";
import { isPack, type EquityQuote, type Pack, type PriceTick } from "./types";
import {
  modelKindOf,
  valuationFromBackend,
  type BackendModelRow,
  type ModelKind,
  type ValuationResult,
} from "./valuation";

const DEFAULT_ROOT = "D:\\Git\\investo-ro";

type UniverseRow = {
  symbol?: string;
  name?: string;
  sector?: string;
  caenDescription?: string;
};

type SectorsFile = {
  default_pack?: string;
  pack_to_valuation?: Record<string, string>;
};

type SnapshotFile = {
  price?: number;
  priceDate?: string;
  caenDescription?: string;
  ranking?: { signals?: string[] };
};

type ValuationFile = {
  symbol?: string;
  pack?: string;
  models?: BackendModelRow[];
};

type PriceFile = {
  prices?: { date?: string; close?: number }[];
};

export type DeskData = {
  names: EquityQuote[];
  valuations: Record<string, ValuationResult>;
  news: NewsHit[];
};

export function investoRoRoot(): string {
  return env("INVESTO_RO_ROOT") ?? DEFAULT_ROOT;
}

export function investoRoConfigDir(): string {
  return path.join(investoRoRoot(), "config");
}

export function investoRoDataDir(): string {
  return path.join(investoRoRoot(), "data");
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function packOf(sector: string | undefined, fallback: Pack): Pack {
  if (sector && isPack(sector)) return sector;
  return fallback;
}

function preferredKind(pack: Pack, map: Record<string, string> | undefined): ModelKind {
  const raw = map?.[pack] ?? (pack === "financials_other" ? map?.financials : undefined) ?? "fcff";
  return modelKindOf(raw) ?? "fcff";
}

function pickModel(models: BackendModelRow[], kind: ModelKind): BackendModelRow | undefined {
  const ok = models.filter((row) => row.status === "ok");
  const wanted = kind === "ri" ? "residual_income" : kind;
  return ok.find((row) => row.model === wanted || modelKindOf(row.model) === kind) ?? ok[0];
}

function formatAsOf(priceDate: string | undefined): string {
  if (!priceDate) return "Local snapshot";
  const stamp = new Date(`${priceDate}T00:00:00`);
  if (Number.isNaN(stamp.getTime())) return priceDate;
  return stamp.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function lastTwoCloses(file: PriceFile | null): { last?: number; prev?: number; lastDate?: string } {
  let last: number | undefined;
  let prev: number | undefined;
  let lastDate: string | undefined;
  for (const row of file?.prices ?? []) {
    const close = Number(row.close);
    if (!Number.isFinite(close) || close <= 0) continue;
    prev = last;
    last = close;
    lastDate = row.date;
  }
  return { last, prev, lastDate };
}

/** Universe from config, prices and models from data/companies. */
export async function loadDesk(): Promise<DeskData> {
  const root = investoRoRoot();
  const configDir = path.join(root, "config");
  const companiesDir = path.join(root, "data", "companies");
  const sectors = await readJson<SectorsFile>(path.join(configDir, "sectors.json"));
  const fallback: Pack =
    sectors?.default_pack && isPack(sectors.default_pack) ? sectors.default_pack : "industrial";
  const rows = await readJson<UniverseRow[]>(path.join(configDir, "universe.json"));
  if (!Array.isArray(rows)) return { names: [], valuations: {}, news: [] };

  const names: EquityQuote[] = [];
  const valuations: Record<string, ValuationResult> = {};
  const news: NewsHit[] = [];

  await Promise.all(
    rows.map(async (row) => {
      const ticker = row.symbol?.trim().toUpperCase();
      const name = row.name?.trim();
      if (!ticker || !name) return;
      const pack = packOf(row.sector, fallback);
      const dir = path.join(companiesDir, ticker);
      const [snapshot, valuation, priceFile] = await Promise.all([
        readJson<SnapshotFile>(path.join(dir, "snapshot.json")),
        readJson<ValuationFile>(path.join(dir, "valuation.json")),
        readJson<PriceFile>(path.join(dir, "price.json")),
      ]);
      const closes = lastTwoCloses(priceFile);
      const snap = Number(snapshot?.price);
      const last =
        closes.last ?? (Number.isFinite(snap) && snap > 0 ? snap : 0);
      const asOf = formatAsOf(closes.lastDate ?? snapshot?.priceDate);
      const blurb = snapshot?.caenDescription?.trim() || row.caenDescription?.trim();

      names.push({
        ticker,
        name,
        pack,
        price: last,
        open: last,
        prevClose: closes.prev,
        asOf,
        blurb: blurb && blurb !== "\u00a0" ? blurb : undefined,
      });

      const picked = pickModel(valuation?.models ?? [], preferredKind(pack, sectors?.pack_to_valuation));
      if (picked) {
        const mapped = valuationFromBackend(picked, asOf);
        if (mapped) valuations[ticker] = mapped;
      }

      const day = snapshot?.priceDate ?? "1970-01-01";
      for (const [index, headline] of (snapshot?.ranking?.signals ?? []).entries()) {
        if (!headline) continue;
        news.push({
          id: `${ticker}-rank-${index}`,
          ticker,
          headline,
          source: "Snapshot",
          at: `${day}T00:00:00.000Z`,
        });
      }
    }),
  );

  names.sort((a, b) => a.ticker.localeCompare(b.ticker));
  return { names, valuations, news };
}

export async function loadUniverse(): Promise<EquityQuote[]> {
  const desk = await loadDesk();
  return desk.names;
}

export async function loadTickerNames(): Promise<Record<string, string>> {
  const rows = await readJson<UniverseRow[]>(path.join(investoRoConfigDir(), "universe.json"));
  const map: Record<string, string> = {};
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    const ticker = row.symbol?.trim().toUpperCase();
    const name = row.name?.trim();
    if (!ticker || !name) continue;
    map[ticker] = name;
  }
  return map;
}

/** Daily closes from data/companies/{ticker}/price.json. */
export async function loadPriceHistory(ticker: string): Promise<PriceTick[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  const file = path.join(investoRoDataDir(), "companies", symbol, "price.json");
  const data = await readJson<PriceFile>(file);
  const series: PriceTick[] = [];
  for (const row of data?.prices ?? []) {
    const close = Number(row.close);
    if (!row.date || !Number.isFinite(close) || close <= 0) continue;
    const t = Date.parse(`${row.date}T00:00:00`);
    if (!Number.isFinite(t)) continue;
    series.push({ t, p: close });
  }
  series.sort((a, b) => a.t - b.t);
  return series;
}
