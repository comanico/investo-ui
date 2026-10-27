"use client";

import { useEffect, useState } from "react";
import type { NewsHit } from "@/lib/news";

export function useDeskNews(tickers: string[]): NewsHit[] {
  const [hits, setHits] = useState<NewsHit[]>([]);
  const key = tickers.join(",");

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/news?tickers=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: NewsHit[]) => {
        if (ctrl.signal.aborted) return;
        setHits(Array.isArray(data) ? data : []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (ctrl.signal.aborted) return;
        setHits([]);
      });
    return () => ctrl.abort();
  }, [key]);

  return hits;
}
