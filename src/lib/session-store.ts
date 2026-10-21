import { create } from "zustand";
import type { NewsHit } from "./news";
import type { EquityQuote, PriceTick } from "./types";
import type { ValuationResult } from "./valuation";

type SessionState = {
  names: EquityQuote[];
  valuations: Record<string, ValuationResult>;
  news: NewsHit[];
  history: Record<string, PriceTick[]>;
  setDesk: (desk: {
    names: EquityQuote[];
    valuations: Record<string, ValuationResult>;
    news: NewsHit[];
  }) => void;
};

export const useSession = create<SessionState>((set) => ({
  names: [],
  valuations: {},
  news: [],
  history: {},
  setDesk: (desk) => set(desk),
}));
