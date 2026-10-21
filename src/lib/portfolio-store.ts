import { create } from "zustand";
import type { Holding } from "./portfolio";

const KEY = "investo-book";

function read(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Holding[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row) =>
        row &&
        typeof row.ticker === "string" &&
        typeof row.qty === "number" &&
        row.qty > 0 &&
        typeof row.avgCost === "number",
    );
  } catch {
    return [];
  }
}

function write(holdings: Holding[]) {
  window.localStorage.setItem(KEY, JSON.stringify(holdings));
}

type BookState = {
  holdings: Holding[];
  hydrated: boolean;
  hydrate: () => void;
  saveLine: (holding: Holding) => void;
  remove: (ticker: string) => void;
  replace: (holdings: Holding[]) => void;
};

export const useBook = create<BookState>((set, get) => ({
  holdings: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ holdings: read(), hydrated: true });
  },
  saveLine: (holding) => {
    const next = [
      ...get().holdings.filter((row) => row.ticker !== holding.ticker),
      holding,
    ].sort((a, b) => a.ticker.localeCompare(b.ticker));
    write(next);
    set({ holdings: next, hydrated: true });
  },
  remove: (ticker) => {
    const next = get().holdings.filter((row) => row.ticker !== ticker);
    write(next);
    set({ holdings: next, hydrated: true });
  },
  replace: (holdings) => {
    const next = [...holdings].sort((a, b) => a.ticker.localeCompare(b.ticker));
    write(next);
    set({ holdings: next, hydrated: true });
  },
}));
