"use client";

import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import type { NewsHit } from "./news";
import type { EquityQuote } from "./types";
import type { ValuationResult } from "./valuation";
import { useSession } from "./session-store";

type DeskContextValue = {
  names: EquityQuote[];
  valuations: Record<string, ValuationResult>;
  news: NewsHit[];
};

const DeskContext = createContext<DeskContextValue | null>(null);

export function SessionProvider({
  names,
  valuations,
  news,
  children,
}: DeskContextValue & { children: ReactNode }) {
  const setDesk = useSession((s) => s.setDesk);

  useLayoutEffect(() => {
    setDesk({ names, valuations, news });
  }, [names, valuations, news, setDesk]);

  return <DeskContext.Provider value={{ names, valuations, news }}>{children}</DeskContext.Provider>;
}

export function useNames(): EquityQuote[] {
  const fromCtx = useContext(DeskContext)?.names;
  const fromStore = useSession((s) => s.names);
  return fromCtx ?? fromStore;
}

export function useValuation(ticker: string): ValuationResult | null {
  const fromCtx = useContext(DeskContext)?.valuations;
  const fromStore = useSession((s) => s.valuations);
  const map = fromCtx ?? fromStore;
  return map[ticker.toUpperCase()] ?? null;
}

export function useNews(): NewsHit[] {
  const fromCtx = useContext(DeskContext)?.news;
  const fromStore = useSession((s) => s.news);
  return fromCtx ?? fromStore;
}
