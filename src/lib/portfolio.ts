export type Holding = {
  id: string;
  ticker: string;
  qty: number;
  avgCost: number;
  boughtOn: string;
};

export type HoldingLine = {
  ticker: string;
  qty: number;
  avgCost: number;
  lots: Holding[];
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
    holdings.push({
      id: newId(),
      ticker,
      qty,
      avgCost: avgRaw ?? 0,
      boughtOn: "",
    });
  }

  return { holdings, errors };
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `lot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function groupHoldings(holdings: Holding[]): HoldingLine[] {
  const map = new Map<string, Holding[]>();
  for (const row of holdings) {
    const list = map.get(row.ticker) ?? [];
    list.push(row);
    map.set(row.ticker, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ticker, lots]) => {
      const qty = lots.reduce((sum, lot) => sum + lot.qty, 0);
      const spent = lots.reduce((sum, lot) => sum + lot.qty * lot.avgCost, 0);
      return { ticker, qty, avgCost: qty === 0 ? 0 : spent / qty, lots };
    });
}

export function linePnl(qty: number, avgCost: number, last: number) {
  const cost = qty * avgCost;
  const value = qty * last;
  const pnl = value - cost;
  const pnlPct = cost === 0 ? 0 : (pnl / cost) * 100;
  return { cost, value, pnl, pnlPct };
}
