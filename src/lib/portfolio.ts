import type { EquityQuote, PriceTick } from "./types";

export type Holding = {
  ticker: string;
  qty: number;
  avgCost: number;
};

export type ParseResult = {
  holdings: Holding[];
  errors: string[];
};

const TICKER_HEADERS = new Set(["ticker", "symbol", "simbol", "simbolul", "emitent", "isin"]);
const QTY_HEADERS = new Set(["qty", "quantity", "cantitate", "shares", "actiuni", "volum", "numar", "nr", "units"]);
const AVG_HEADERS = new Set(["avg", "average", "avgcost", "cost", "pret", "pretmediu", "pmp", "price", "achizitie"]);

function normHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseNum(raw: string): number | null {
  let value = raw.trim().replace(/\s/g, "");
  if (!value) return null;
  if (value.includes(",") && value.includes(".")) {
    if (value.lastIndexOf(",") > value.lastIndexOf(".")) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function delimiterOf(header: string): string {
  const semi = header.split(";").length;
  const comma = header.split(",").length;
  return semi > comma ? ";" : ",";
}

export function parseHoldingsCsv(text: string, known: ReadonlySet<string>): ParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return { holdings: [], errors: ["The file is empty."] };

  const delimiter = delimiterOf(lines[0] ?? "");
  const first = splitLine(lines[0] ?? "", delimiter).map(normHeader);
  const headerTicker = first.findIndex((cell) => TICKER_HEADERS.has(cell));
  const headerQty = first.findIndex((cell) => QTY_HEADERS.has(cell));
  const headerAvg = first.findIndex((cell) => AVG_HEADERS.has(cell));
  const hasHeader = headerTicker >= 0 && headerQty >= 0;
  const start = hasHeader ? 1 : 0;
  const tickerCol = hasHeader ? headerTicker : 0;
  const qtyCol = hasHeader ? headerQty : 1;
  const avgCol = hasHeader ? headerAvg : 2;

  const holdings: Holding[] = [];
  const errors: string[] = [];

  for (let i = start; i < lines.length; i += 1) {
    const cells = splitLine(lines[i] ?? "", delimiter);
    const ticker = (cells[tickerCol] ?? "").toUpperCase().replace(/[^A-Z0-9.]/g, "");
    const qty = parseNum(cells[qtyCol] ?? "");
    const avgRaw = avgCol >= 0 ? parseNum(cells[avgCol] ?? "") : null;
    const row = i + 1;
    if (!ticker) {
      errors.push(`Row ${row}: missing ticker.`);
      continue;
    }
    if (!known.has(ticker)) {
      errors.push(`Row ${row}: ${ticker} is not loaded.`);
      continue;
    }
    if (qty == null || qty <= 0) {
      errors.push(`Row ${row}: quantity must be above zero.`);
      continue;
    }
    if (avgRaw != null && avgRaw < 0) {
      errors.push(`Row ${row}: average cost cannot be negative.`);
      continue;
    }
    holdings.push({ ticker, qty, avgCost: avgRaw ?? 0 });
  }

  return { holdings: collapse(holdings), errors };
}

function collapse(rows: Holding[]): Holding[] {
  const map = new Map<string, Holding>();
  for (const row of rows) {
    const prev = map.get(row.ticker);
    if (!prev) {
      map.set(row.ticker, { ...row });
      continue;
    }
    const qty = prev.qty + row.qty;
    const avgCost = qty === 0 ? 0 : (prev.qty * prev.avgCost + row.qty * row.avgCost) / qty;
    map.set(row.ticker, { ticker: row.ticker, qty, avgCost });
  }
  return [...map.values()];
}

export function bookValue(holdings: Holding[], names: EquityQuote[], priceOf: (quote: EquityQuote) => number): number {
  const quotes = new Map(names.map((quote) => [quote.ticker, quote]));
  return holdings.reduce((sum, holding) => {
    const quote = quotes.get(holding.ticker);
    if (!quote) return sum;
    return sum + holding.qty * priceOf(quote);
  }, 0);
}

export function portfolioSeries(
  holdings: Holding[],
  names: EquityQuote[],
  history: Record<string, PriceTick[]>,
): PriceTick[] {
  const quotes = new Map(names.map((quote) => [quote.ticker, quote]));
  const active = holdings.filter((holding) => quotes.has(holding.ticker) && holding.qty > 0);
  if (active.length === 0) return [];

  const last = new Map<string, number>();
  const events: { t: number; ticker: string; p: number }[] = [];
  for (const holding of active) {
    const quote = quotes.get(holding.ticker);
    if (!quote) continue;
    last.set(holding.ticker, quote.open);
    for (const point of history[holding.ticker] ?? []) {
      events.push({ t: point.t, ticker: holding.ticker, p: point.p });
    }
  }
  events.sort((a, b) => a.t - b.t);

  const mark = () =>
    active.reduce((sum, holding) => sum + holding.qty * (last.get(holding.ticker) ?? 0), 0);

  const points: PriceTick[] = [];
  for (const event of events) {
    last.set(event.ticker, event.p);
    const previous = points.at(-1);
    if (previous && previous.t === event.t) {
      previous.p = mark();
      continue;
    }
    points.push({ t: event.t, p: mark() });
  }
  return points;
}
