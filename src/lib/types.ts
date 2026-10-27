export const PACKS = [
  "banks",
  "energy",
  "utilities",
  "industrial",
  "real_estate",
  "holding",
  "consumer",
  "healthcare",
  "telecom",
  "technology",
  "financials_other",
] as const;

export type Pack = (typeof PACKS)[number];

export function isPack(value: string): value is Pack {
  return (PACKS as readonly string[]).includes(value);
}

export type Theme = "ai" | "war";

export type EquityQuote = {
  ticker: string;
  name: string;
  pack: Pack;
  price: number;
  open: number;
  prevClose?: number;
  asOf?: string;
  blurb?: string;
  themes?: Theme[];
};

export type PrintSide = "buy" | "sell" | "watch";

export type Print = {
  id: string;
  ticker: string;
  name: string;
  side: PrintSide;
  qty: number;
  price: number;
  desk: string;
  at: number;
};

export type PriceTick = {
  t: number;
  p: number;
};
