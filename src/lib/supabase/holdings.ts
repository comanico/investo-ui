import type { Holding } from "../portfolio";
import { createClient } from "./client";

type Row = {
  id: string;
  ticker: string;
  qty: number | string;
  avg_cost: number | string;
  bought_on: string;
};

function asHolding(row: Row): Holding {
  return {
    id: row.id,
    ticker: row.ticker,
    qty: Number(row.qty),
    avgCost: Number(row.avg_cost),
    boughtOn: row.bought_on,
  };
}

export async function fetchHoldings(): Promise<Holding[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("holdings")
    .select("id, ticker, qty, avg_cost, bought_on")
    .order("ticker");
  if (error) return null;
  return (data as Row[] | null)?.map(asHolding) ?? [];
}

export async function insertHolding(holding: Holding): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("holdings").insert({
    id: holding.id,
    user_id: user.id,
    ticker: holding.ticker,
    qty: holding.qty,
    avg_cost: holding.avgCost,
    bought_on: holding.boughtOn,
  });
  return !error;
}

export async function deleteHoldings(ticker: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("holdings").delete().eq("ticker", ticker);
  return !error;
}

export async function replaceHoldings(holdings: Holding[]): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const wipe = await supabase.from("holdings").delete().eq("user_id", user.id);
  if (wipe.error) return false;
  if (holdings.length === 0) return true;
  const { error } = await supabase.from("holdings").insert(
    holdings.map((holding) => ({
      id: holding.id,
      user_id: user.id,
      ticker: holding.ticker,
      qty: holding.qty,
      avg_cost: holding.avgCost,
      bought_on: holding.boughtOn,
    })),
  );
  return !error;
}
