export type NewsHit = {
  id: string;
  ticker: string;
  headline: string;
  source: string;
  at: string;
};

export function newsFor(tickers: Iterable<string>, items: NewsHit[]): NewsHit[] {
  const wanted = new Set(Array.from(tickers, (ticker) => ticker.toUpperCase()));
  return items.filter((item) => wanted.has(item.ticker)).sort((a, b) => (a.at < b.at ? 1 : -1));
}
