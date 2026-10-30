export type DeskName = {
  ticker: string;
  name: string;
};

function foldQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Ticker exact match, or a unique company name (at least 3 characters). */
export function matchDeskName(query: string, names: DeskName[]): string | null {
  const raw = query.trim();
  if (!raw) return null;
  const ticker = raw.toUpperCase();
  const byTicker = names.find((row) => row.ticker.toUpperCase() === ticker);
  if (byTicker) return byTicker.ticker;

  const needle = foldQuery(raw);
  if (needle.length < 3) return null;

  const exact = names.filter((row) => foldQuery(row.name) === needle);
  if (exact.length === 1) return exact[0]!.ticker;

  const prefix = names.filter((row) => foldQuery(row.name).startsWith(needle));
  if (prefix.length === 1) return prefix[0]!.ticker;

  const inside = names.filter((row) => foldQuery(row.name).includes(needle));
  if (inside.length === 1) return inside[0]!.ticker;

  return null;
}

/** Find a desk ticker mentioned inside a longer question. */
export function findDeskTicker(query: string, names: DeskName[]): string | null {
  const whole = matchDeskName(query, names);
  if (whole) return whole;

  const foldedQ = foldQuery(query);
  if (!foldedQ) return null;
  const tokens = foldedQ.split(/[^a-z0-9.]+/).filter(Boolean);

  for (const token of tokens) {
    const hit = names.find((row) => foldQuery(row.ticker) === token);
    if (hit) return hit.ticker;
  }

  const nameHits = names
    .map((row) => {
      const folded = foldQuery(row.name);
      const core = folded
        .replace(/\bs\.a\.?/g, " ")
        .replace(/\bsa\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return { ticker: row.ticker, folded, core };
    })
    .filter((row) => {
      if (row.folded.length >= 3 && foldedQ.includes(row.folded)) return true;
      if (row.core.length >= 3 && foldedQ.includes(row.core)) return true;
      return false;
    })
    .sort((a, b) => b.core.length - a.core.length);

  if (nameHits.length === 0) return null;
  return nameHits[0]!.ticker;
}

const SUGGEST_LIMIT = 8;

/** Ranked ticker and name hits while the user is typing. */
export function suggestDeskNames(query: string, names: DeskName[]): DeskName[] {
  const needle = foldQuery(query);
  if (!needle) return [];

  const scored = names
    .map((row) => {
      const ticker = foldQuery(row.ticker);
      const name = foldQuery(row.name);
      let score = 0;
      if (ticker === needle) score = 400;
      else if (ticker.startsWith(needle)) score = 300;
      else if (ticker.includes(needle)) score = 200;
      else if (name.startsWith(needle)) score = 150;
      else if (name.includes(needle)) score = 100;
      else return null;
      return { row, score, ticker };
    })
    .filter((hit): hit is { row: DeskName; score: number; ticker: string } => hit !== null)
    .sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker));

  const seen = new Set<string>();
  const out: DeskName[] = [];
  for (const hit of scored) {
    if (seen.has(hit.row.ticker)) continue;
    seen.add(hit.row.ticker);
    out.push(hit.row);
    if (out.length >= SUGGEST_LIMIT) break;
  }
  return out;
}
