import type { EquityQuote, Pack, Theme } from "./types";

export const PACK_LABEL: Record<Pack, string> = {
  banks: "Banks",
  energy: "Energy",
  utilities: "Utilities",
  industrial: "Industrial",
  real_estate: "Real estate",
  holding: "Holdings",
  consumer: "Consumer",
  healthcare: "Healthcare",
  telecom: "Telecom",
  technology: "Technology",
  financials_other: "Financials",
};

export function formatRon(n: number): string {
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

export function formatQty(n: number): string {
  return n.toLocaleString("ro-RO");
}

export type Desk = {
  id: string;
  title: string;
  kind: "trending" | "industry";
  pack?: Pack;
  theme?: Theme;
};

export const DESKS: Desk[] = [
  { id: "banks", title: "Banks", kind: "industry", pack: "banks" },
  { id: "energy", title: "Energy", kind: "industry", pack: "energy" },
  { id: "utilities", title: "Utilities", kind: "industry", pack: "utilities" },
  { id: "industrial", title: "Industrial", kind: "industry", pack: "industrial" },
  { id: "real_estate", title: "Real estate", kind: "industry", pack: "real_estate" },
  { id: "holding", title: "Holdings", kind: "industry", pack: "holding" },
  { id: "consumer", title: "Consumer", kind: "industry", pack: "consumer" },
  { id: "healthcare", title: "Healthcare", kind: "industry", pack: "healthcare" },
  { id: "telecom", title: "Telecom", kind: "industry", pack: "telecom" },
  { id: "technology", title: "Technology", kind: "industry", pack: "technology" },
  { id: "financials_other", title: "Financials", kind: "industry", pack: "financials_other" },
];

export function namesInDesk(names: EquityQuote[], desk: Desk): EquityQuote[] {
  return names.filter((quote) => {
    if (desk.theme) return quote.themes?.includes(desk.theme) ?? false;
    return quote.pack === desk.pack;
  });
}
