export type NewsHit = {
  id: string;
  ticker: string;
  headline: string;
  source: string;
  at: string;
  url?: string;
};

export function byNewest(a: NewsHit, b: NewsHit): number {
  const ta = Date.parse(a.at);
  const tb = Date.parse(b.at);
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return tb - ta;
}

export function newsFor(tickers: Iterable<string>, items: NewsHit[]): NewsHit[] {
  const wanted = new Set(Array.from(tickers, (ticker) => ticker.toUpperCase()));
  return items.filter((item) => wanted.has(item.ticker.toUpperCase())).sort(byNewest);
}
