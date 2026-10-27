export type NewsHit = {
  id: string;
  ticker: string;
  headline: string;
  source: string;
  at: string;
  url?: string;
};

export function newsFor(tickers: Iterable<string>, items: NewsHit[]): NewsHit[] {
  const wanted = new Set(Array.from(tickers, (ticker) => ticker.toUpperCase()));
  const matched = items.filter((item) => wanted.has(item.ticker.toUpperCase()));
  if (matched.length) return [...matched].sort((a, b) => (a.at < b.at ? 1 : -1));
  const general = items.filter((item) => item.ticker.toUpperCase() === "BVB");
  const tape = general.length ? general : items;
  return [...tape].sort((a, b) => (a.at < b.at ? 1 : -1));
}
