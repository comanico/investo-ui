import type { PriceTick } from "./types";

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export type ShareLot = {
  ticker: string;
  qty: number;
  boughtOn: string;
};

export type ChartGeom = {
  width: number;
  height: number;
  line: string;
  area: string;
  up: boolean;
  down: boolean;
  startLabel: string;
  endLabel: string;
};

export function sliceYear(series: PriceTick[]): PriceTick[] {
  const end = series.at(-1)?.t;
  if (end == null) return series;
  const start = end - YEAR_MS;
  const sliced = series.filter((row) => row.t >= start);
  return sliced.length >= 2 ? sliced : series;
}

export function downsample(series: PriceTick[], count = 96): PriceTick[] {
  if (series.length <= count) return series;
  const out: PriceTick[] = [];
  const last = series.length - 1;
  for (let i = 0; i < count; i += 1) {
    const row = series[Math.round((i / (count - 1)) * last)];
    if (row) out.push(row);
  }
  return out;
}

function formatChartDate(t: number): string {
  return new Date(t).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function chartGeom(series: PriceTick[], width = 920, height = 300): ChartGeom | null {
  const sliced = downsample(sliceYear(series), 96);
  if (sliced.length < 2) return null;
  const first = sliced[0];
  const last = sliced[sliced.length - 1];
  if (!first || !last) return null;
  const prices = sliced.map((row) => row.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(max - min, Math.abs(min) * 0.04, 0.02);
  const padX = 4;
  const padT = 18;
  const padB = 8;
  const innerW = width - padX * 2;
  const innerH = height - padT - padB;
  const n = sliced.length - 1;
  const points = sliced.map((row, i) => {
    const x = padX + (i / n) * innerW;
    const y = padT + (1 - (row.p - min) / span) * innerH;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M${points.join("L")}`;
  const bottom = (height - padB).toFixed(1);
  const area = `${line}L${(padX + innerW).toFixed(1)} ${bottom}L${padX.toFixed(1)} ${bottom}Z`;
  return {
    width,
    height,
    line,
    area,
    up: last.p > first.p,
    down: last.p < first.p,
    startLabel: formatChartDate(first.t),
    endLabel: formatChartDate(last.t),
  };
}

export function bookValueSeries(lots: ShareLot[], histories: Record<string, PriceTick[]>): PriceTick[] {
  const byTime = new Map<number, { ticker: string; p: number }[]>();
  for (const lot of lots) {
    for (const tick of histories[lot.ticker] ?? []) {
      const list = byTime.get(tick.t) ?? [];
      list.push({ ticker: lot.ticker, p: tick.p });
      byTime.set(tick.t, list);
    }
  }
  const times = [...byTime.keys()].sort((a, b) => a - b);
  if (times.length === 0) return [];
  const last = new Map<string, number>();
  const out: PriceTick[] = [];
  const end = times[times.length - 1] ?? 0;
  const start = end - YEAR_MS;
  for (const t of times) {
    for (const row of byTime.get(t) ?? []) last.set(row.ticker, row.p);
    if (t < start) continue;
    let value = 0;
    let held = false;
    for (const lot of lots) {
      if (lot.boughtOn) {
        const on = Date.parse(`${lot.boughtOn}T00:00:00`);
        if (Number.isFinite(on) && t < on) continue;
      }
      const price = last.get(lot.ticker);
      if (price == null) continue;
      value += lot.qty * price;
      held = true;
    }
    if (held) out.push({ t, p: value });
  }
  return out;
}

export function parseShareLots(value: unknown): ShareLot[] {
  if (!Array.isArray(value)) return [];
  const lots: ShareLot[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticker = typeof row.ticker === "string" ? row.ticker.trim().toUpperCase() : "";
    const qty = typeof row.qty === "number" ? row.qty : Number(row.qty);
    if (!ticker || !Number.isFinite(qty) || qty <= 0) continue;
    const boughtOn = typeof row.boughtOn === "string" ? row.boughtOn : "";
    lots.push({ ticker, qty, boughtOn });
  }
  return lots;
}
