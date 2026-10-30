import { create } from "zustand";
import type { Holding } from "./portfolio";
import { newId } from "./portfolio";
import { deleteHoldings, fetchHoldings, insertHolding, replaceHoldings } from "./supabase/holdings";

function storageKey(userId: string) {
  return `investo-book:${userId}`;
}

function readLocal(userId: string): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Holding>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (!row || typeof row.ticker !== "string") return [];
      const qty = Number(row.qty);
      const avgCost = Number(row.avgCost);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(avgCost)) return [];
      return [
        {
          id: typeof row.id === "string" && row.id ? row.id : newId(),
          ticker: row.ticker,
          qty,
          avgCost,
          boughtOn: typeof row.boughtOn === "string" ? row.boughtOn : "",
        },
      ];
    });
  } catch {
    return [];
  }
}

function writeLocal(userId: string, holdings: Holding[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(holdings));
}

type BookState = {
  userId: string | null;
  holdings: Holding[];
  hydrated: boolean;
  hydrate: (userId: string) => Promise<void>;
  addLot: (holding: Holding) => Promise<void>;
  remove: (ticker: string) => Promise<void>;
  replace: (holdings: Holding[]) => Promise<void>;
};

export const useBook = create<BookState>((set, get) => ({
  userId: null,
  holdings: [],
  hydrated: false,
  hydrate: async (userId) => {
    if (get().hydrated && get().userId === userId) return;
    const remote = await fetchHoldings();
    const holdings = remote ?? readLocal(userId);
    if (remote) writeLocal(userId, remote);
    set({ userId, holdings, hydrated: true });
  },
  addLot: async (holding) => {
    const userId = get().userId;
    const next = [...get().holdings, holding].sort((a, b) => a.ticker.localeCompare(b.ticker));
    if (userId) writeLocal(userId, next);
    set({ holdings: next, hydrated: true });
    await insertHolding(holding);
  },
  remove: async (ticker) => {
    const userId = get().userId;
    const next = get().holdings.filter((row) => row.ticker !== ticker);
    if (userId) writeLocal(userId, next);
    set({ holdings: next, hydrated: true });
    await deleteHoldings(ticker);
  },
  replace: async (holdings) => {
    const userId = get().userId;
    const next = [...holdings].sort((a, b) => a.ticker.localeCompare(b.ticker));
    if (userId) writeLocal(userId, next);
    set({ holdings: next, hydrated: true });
    await replaceHoldings(next);
  },
}));
