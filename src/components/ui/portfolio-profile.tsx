"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import { TransitionLink } from "@/components/transition-link";
import { useBook } from "@/lib/portfolio-store";
import { groupHoldings, linePnl, newId, parseHoldingsCsv } from "@/lib/portfolio";
import { formatQty, formatRon } from "@/lib/market";
import { bucharestToday } from "@/lib/prices";
import { newsFor } from "@/lib/news";
import { useDeskNews } from "@/lib/use-desk-news";
import { useNames } from "@/lib/session-provider";
import { useSupabaseSession } from "@/lib/supabase/use-session";
import { SessionRegistry } from "./session-registry";
import { formatSignedPct } from "@/lib/valuation";
import { cn } from "@/lib/utils";

function formatMoney(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PortfolioProfile() {
  const { user } = useSupabaseSession();
  const names = useNames();
  const holdings = useBook((s) => s.holdings);
  const hydrate = useBook((s) => s.hydrate);
  const addLot = useBook((s) => s.addLot);
  const remove = useBook((s) => s.remove);
  const replace = useBook((s) => s.replace);

  const today = bucharestToday();
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [when, setWhen] = useState<"today" | "earlier">("today");
  const [boughtOn, setBoughtOn] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [csvNote, setCsvNote] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) void hydrate(user.id);
  }, [hydrate, user?.id]);

  useEffect(() => {
    if (!ticker && names[0]) setTicker(names[0].ticker);
  }, [names, ticker]);

  const quotes = useMemo(() => new Map(names.map((quote) => [quote.ticker, quote])), [names]);
  const lines = useMemo(() => groupHoldings(holdings), [holdings]);
  const holdingTickers = useMemo(() => lines.map((line) => line.ticker), [lines]);
  const deskNews = useDeskNews(holdingTickers);
  const news = newsFor(holdingTickers, deskNews);
  const quote = quotes.get(ticker);
  const lastForForm = quote?.price ?? 0;
  const value = lines.reduce((sum, line) => sum + line.qty * (quotes.get(line.ticker)?.price ?? 0), 0);
  const cost = lines.reduce((sum, line) => sum + line.qty * line.avgCost, 0);
  const prevValue = lines.reduce((sum, line) => {
    const row = quotes.get(line.ticker);
    if (!row) return sum;
    const prev = row.prevClose && row.prevClose > 0 ? row.prevClose : row.open;
    return sum + line.qty * prev;
  }, 0);
  const day = value - prevValue;
  const dayPct = prevValue === 0 ? 0 : (day / prevValue) * 100;
  const pnl = value - cost;
  const pnlPct = cost === 0 ? 0 : (pnl / cost) * 100;
  const isUp = pnl > 0;
  const isDown = pnl < 0;

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    const symbol = ticker.toUpperCase();
    const named = quotes.get(symbol);
    const shares = Number(qty.replace(",", "."));
    if (!named) {
      setFormError("Pick a Romanian ticker from the list.");
      return;
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      setFormError("Number of shares has to be above zero.");
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      if (when === "today" && !(named.price > 0)) {
        setFormError("No last price for this ticker yet.");
        return;
      }
      let avgCost = named.price;
      let on = today;
      if (when === "earlier") {
        const typed = price.trim() === "" ? null : Number(price.replace(",", "."));
        if (typed != null && (!Number.isFinite(typed) || typed < 0)) {
          setFormError("Purchase price has to be zero or more.");
          return;
        }
        if (typed != null && Number.isFinite(typed)) {
          avgCost = typed;
          on = boughtOn || today;
        } else if (boughtOn) {
          const res = await fetch(`/api/price?ticker=${encodeURIComponent(symbol)}&date=${encodeURIComponent(boughtOn)}`);
          const body = (await res.json()) as { date?: string; close?: number; error?: string };
          if (!res.ok || body.close == null) {
            setFormError("No BVB close on or before that date for this ticker.");
            return;
          }
          avgCost = body.close;
          on = body.date ?? boughtOn;
        } else {
          setFormError("Enter the purchase price, or the date so the close can be filled in.");
          return;
        }
      }
      await addLot({ id: newId(), ticker: symbol, qty: shares, avgCost, boughtOn: on });
      setQty("");
      setPrice("");
      setCsvNote(null);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const known = new Set(names.map((row) => row.ticker));
    const parsed = parseHoldingsCsv(text, known);
    if (parsed.holdings.length === 0) {
      setCsvNote(parsed.errors[0] ?? "No holdings found in that file.");
      return;
    }
    const filled = parsed.holdings.map((holding) => ({
      ...holding,
      avgCost: holding.avgCost > 0 ? holding.avgCost : (quotes.get(holding.ticker)?.price ?? 0),
      boughtOn: holding.boughtOn || today,
    }));
    await replace(filled);
    const skipped = parsed.errors.length;
    setCsvNote(
      skipped === 0
        ? `Loaded ${filled.length} lines. This extract replaced the book.`
        : `Loaded ${filled.length} lines. Skipped ${skipped}. This extract replaced the book.`,
    );
    setFormError(null);
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 lg:flex-row lg:overflow-hidden">
      <div className="min-w-0 flex-1 space-y-4 lg:overflow-y-auto lg:pr-1">
        <TransitionLink
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-fg/70 transition-colors duration-200 hover:text-fg"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Heat
        </TransitionLink>

        <section className={cn("heat-tile p-5 sm:p-6", isUp && "is-up", isDown && "is-down")}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-fg/10 sm:size-20">
              <Briefcase className="size-8 text-fg/90 sm:size-10" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-fg/70">You</p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">Your book</h1>
              <p className="mt-2 text-sm text-fg/65">
                {lines.length} {lines.length === 1 ? "name" : "names"} · BVB
              </p>
            </div>
            <div className="sm:text-right">
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="text-3xl font-bold tabular-nums">{formatMoney(value)}</span>
                <span className="text-sm text-fg/75">RON</span>
              </div>
              <p className="mt-1 text-sm font-medium text-fg/80">
                {formatSignedPct(pnlPct)} vs cost
                <span className="ml-2 tabular-nums text-fg/60">
                  {pnl > 0 ? "+" : pnl < 0 ? "−" : ""}
                  {formatMoney(Math.abs(pnl))} RON
                </span>
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Value" value={`${formatMoney(value)} RON`} />
          <Stat label="Day" value={formatSignedPct(dayPct)} />
          <Stat label="Cost" value={`${formatMoney(cost)} RON`} />
          <Stat label="P&L" value={formatSignedPct(pnlPct)} />
        </div>

        <section className="glass-panel overflow-hidden p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/50">Holdings</h2>
          {lines.length === 0 ? (
            <p className="mt-3 text-sm text-fg/60">Nothing on the book yet. Add a Romanian ticker and the number of shares.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-fg/45">
                    <th className="py-2 pr-3">Ticker</th>
                    <th className="py-2 pr-3 text-right">Shares</th>
                    <th className="py-2 pr-3 text-right">Avg</th>
                    <th className="py-2 pr-3 text-right">Last</th>
                    <th className="py-2 pr-3 text-right">Value</th>
                    <th className="py-2 pr-3 text-right">P&L</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const named = quotes.get(line.ticker);
                    const last = named?.price ?? 0;
                    const stats = linePnl(line.qty, line.avgCost, last);
                    return (
                      <tr key={line.ticker} className="border-b border-fg/5">
                        <td className="py-2 pr-3 font-medium">
                          <TransitionLink href={`/${line.ticker}`} className="hover:underline">
                            {line.ticker}
                          </TransitionLink>
                          <span className="mt-0.5 block text-xs font-normal text-fg/45">{named?.name}</span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatQty(line.qty)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatRon(line.avgCost)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{named ? formatRon(last) : "—"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(stats.value)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          <span className={stats.pnl > 0 ? "text-up" : stats.pnl < 0 ? "text-down" : undefined}>
                            {formatSignedPct(stats.pnlPct)}
                          </span>
                          <span className="mt-0.5 block text-xs text-fg/45">
                            {stats.pnl > 0 ? "+" : stats.pnl < 0 ? "−" : ""}
                            {formatMoney(Math.abs(stats.pnl))} RON
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => void remove(line.ticker)}
                            className="text-xs text-fg/45 underline-offset-2 hover:text-fg hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <SessionRegistry items={news} title="Holdings news" className="h-80" />
      </div>

      <aside className="shrink-0 lg:w-rail">
        <div className="glass-panel flex flex-col gap-6 p-4">
          <form onSubmit={(event) => void onSave(event)} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/50">Add a holding</h2>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-fg/45">
              Romanian ticker
              <select
                value={ticker}
                onChange={(event) => setTicker(event.target.value)}
                disabled={names.length === 0}
                className="h-11 rounded-lg border border-line bg-bg/40 px-3 text-sm font-medium normal-case tracking-normal text-fg"
              >
                {names.length === 0 ? (
                  <option value="">No names loaded</option>
                ) : (
                  names.map((row) => (
                    <option key={row.ticker} value={row.ticker}>
                      {row.ticker} · {row.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-fg/45">
              Shares
              <input
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                inputMode="decimal"
                placeholder="100"
                className="h-11 rounded-lg border border-line bg-bg/40 px-3 text-sm font-medium normal-case tracking-normal text-fg"
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-fg/45">Bought</legend>
              <label className="flex items-center gap-2 text-sm font-medium normal-case tracking-normal text-fg/80">
                <input
                  type="radio"
                  name="when"
                  checked={when === "today"}
                  onChange={() => setWhen("today")}
                />
                Today
              </label>
              <label className="flex items-center gap-2 text-sm font-medium normal-case tracking-normal text-fg/80">
                <input
                  type="radio"
                  name="when"
                  checked={when === "earlier"}
                  onChange={() => setWhen("earlier")}
                />
                Earlier
              </label>
            </fieldset>
            {when === "today" ? (
              <p className="text-sm text-fg/60">
                Cost is today’s last, {lastForForm > 0 ? `${formatRon(lastForForm)} RON` : "once a price is loaded"}.
              </p>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-fg/45">
                  Purchase date
                  <input
                    type="date"
                    max={today}
                    value={boughtOn}
                    onChange={(event) => setBoughtOn(event.target.value)}
                    className="h-11 rounded-lg border border-line bg-bg/40 px-3 text-sm font-medium normal-case tracking-normal text-fg"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-fg/45">
                  Price at the time
                  <input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    inputMode="decimal"
                    placeholder="Leave blank to use the BVB close"
                    className="h-11 rounded-lg border border-line bg-bg/40 px-3 text-sm font-medium normal-case tracking-normal text-fg"
                  />
                </label>
              </>
            )}
            {formError ? <p className="text-sm text-down">{formError}</p> : null}
            <button
              type="submit"
              disabled={names.length === 0 || busy}
              className="h-11 rounded-lg bg-fg text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Save holding
            </button>
          </form>

          <form className="flex flex-col gap-3 border-t border-line pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/50">Broker extract</h2>
            <p className="text-sm leading-relaxed text-fg/60">
              CSV from the broker. Columns: ticker, quantity, and an optional average cost. Comma or semicolon. A
              loaded extract replaces the book.
            </p>
            <label
              className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line text-sm text-fg/70 hover:border-fg/30"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void onFile(event.dataTransfer.files[0]);
              }}
            >
              Drop a CSV, or choose a file
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void onFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            {csvNote ? <p className="text-sm text-fg/70">{csvNote}</p> : null}
          </form>
        </div>
      </aside>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-fg/50">{label}</p>
      <p className="mt-2 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
