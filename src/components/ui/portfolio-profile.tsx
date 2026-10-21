"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import { TransitionLink } from "@/components/transition-link";
import { PortfolioChart } from "./portfolio-chart";
import { useBook } from "@/lib/portfolio-store";
import { bookValue, parseHoldingsCsv, portfolioSeries } from "@/lib/portfolio";
import { formatQty, formatRon } from "@/lib/market";
import { useNames } from "@/lib/session-provider";
import { useSession } from "@/lib/session-store";
import { cn } from "@/lib/utils";

function formatMoney(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PortfolioProfile() {
  const names = useNames();
  const history = useSession((s) => s.history);
  const holdings = useBook((s) => s.holdings);
  const hydrate = useBook((s) => s.hydrate);
  const saveLine = useBook((s) => s.saveLine);
  const remove = useBook((s) => s.remove);
  const replace = useBook((s) => s.replace);

  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [csvNote, setCsvNote] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!ticker && names[0]) setTicker(names[0].ticker);
  }, [names, ticker]);

  const quotes = useMemo(() => new Map(names.map((quote) => [quote.ticker, quote])), [names]);
  const value = bookValue(holdings, names, (quote) => quote.price);
  const openValue = bookValue(holdings, names, (quote) => quote.open);
  const cost = holdings.reduce((sum, holding) => sum + holding.qty * holding.avgCost, 0);
  const day = value - openValue;
  const dayPct = openValue === 0 ? 0 : (day / openValue) * 100;
  const pnl = value - cost;
  const pnlPct = cost === 0 ? 0 : (pnl / cost) * 100;
  const isUp = day > 0;
  const isDown = day < 0;
  const series = useMemo(
    () => portfolioSeries(holdings, names, history),
    [holdings, names, history],
  );

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    const symbol = ticker.toUpperCase();
    const quote = quotes.get(symbol);
    const shares = Number(qty.replace(",", "."));
    if (!quote) {
      setFormError("That ticker is not loaded.");
      return;
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      setFormError("Quantity has to be above zero.");
      return;
    }
    const costInput = avg.trim() === "" ? quote.price : Number(avg.replace(",", "."));
    if (!Number.isFinite(costInput) || costInput < 0) {
      setFormError("Average cost has to be zero or more.");
      return;
    }
    saveLine({ ticker: symbol, qty: shares, avgCost: costInput });
    setQty("");
    setAvg("");
    setFormError(null);
    setCsvNote(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const known = new Set(names.map((quote) => quote.ticker));
    const parsed = parseHoldingsCsv(text, known);
    if (parsed.holdings.length === 0) {
      setCsvNote(parsed.errors[0] ?? "No holdings found in that file.");
      return;
    }
    const filled = parsed.holdings.map((holding) => ({
      ...holding,
      avgCost: holding.avgCost > 0 ? holding.avgCost : (quotes.get(holding.ticker)?.price ?? 0),
    }));
    replace(filled);
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
                {holdings.length} {holdings.length === 1 ? "name" : "names"} · BVB
              </p>
            </div>
            <div className="sm:text-right">
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="text-3xl font-bold tabular-nums">{formatMoney(value)}</span>
                <span className="text-sm text-fg/75">RON</span>
              </div>
              <p className="mt-1 text-sm font-medium text-fg/80">
                <span aria-hidden>{isUp ? "▲" : isDown ? "▼" : "–"} </span>
                {isUp ? "+" : isDown ? "−" : ""}
                {formatMoney(Math.abs(day))} RON ({isUp ? "+" : isDown ? "−" : ""}
                {Math.abs(dayPct).toFixed(1)}%)
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Value" value={`${formatMoney(value)} RON`} />
          <Stat label="Day" value={`${isUp ? "+" : isDown ? "−" : ""}${Math.abs(dayPct).toFixed(1)}%`} />
          <Stat label="Cost" value={`${formatMoney(cost)} RON`} />
          <Stat
            label="vs cost"
            value={`${pnl > 0 ? "+" : pnl < 0 ? "−" : ""}${Math.abs(pnlPct).toFixed(1)}%`}
          />
        </div>

        <PortfolioChart series={series} />

        <section className="glass-panel overflow-hidden p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/50">Holdings</h2>
          {holdings.length === 0 ? (
            <p className="mt-3 text-sm text-fg/60">Nothing on the book yet. Add a line, or drop a broker extract.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-fg/45">
                    <th className="py-2 pr-3">Ticker</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Avg</th>
                    <th className="py-2 pr-3 text-right">Last</th>
                    <th className="py-2 pr-3 text-right">Value</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => {
                    const quote = quotes.get(holding.ticker);
                    const line = quote ? holding.qty * quote.price : 0;
                    return (
                      <tr key={holding.ticker} className="border-b border-fg/5">
                        <td className="py-2 pr-3 font-medium">
                          <TransitionLink href={`/${holding.ticker}`} className="hover:underline">
                            {holding.ticker}
                          </TransitionLink>
                          <span className="mt-0.5 block text-xs font-normal text-fg/45">{quote?.name}</span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatQty(holding.qty)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatRon(holding.avgCost)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{quote ? formatRon(quote.price) : "—"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(line)}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => remove(holding.ticker)}
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
      </div>

      <aside className="shrink-0 lg:w-rail">
        <div className="glass-panel flex flex-col gap-6 p-4">
          <form onSubmit={onSave} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/50">Add a line</h2>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-fg/45">
              Ticker
              <select
                value={ticker}
                onChange={(event) => setTicker(event.target.value)}
                disabled={names.length === 0}
                className="h-11 rounded-lg border border-line bg-bg/40 px-3 text-sm font-medium normal-case tracking-normal text-fg"
              >
                {names.length === 0 ? (
                  <option value="">No names loaded</option>
                ) : (
                  names.map((quote) => (
                    <option key={quote.ticker} value={quote.ticker}>
                      {quote.ticker} · {quote.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-fg/45">
              Quantity
              <input
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                inputMode="decimal"
                placeholder="100"
                className="h-11 rounded-lg border border-line bg-bg/40 px-3 text-sm font-medium normal-case tracking-normal text-fg"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-fg/45">
              Average cost
              <input
                value={avg}
                onChange={(event) => setAvg(event.target.value)}
                inputMode="decimal"
                placeholder="Last, if you leave this blank"
                className="h-11 rounded-lg border border-line bg-bg/40 px-3 text-sm font-medium normal-case tracking-normal text-fg"
              />
            </label>
            {formError ? <p className="text-sm text-down">{formError}</p> : null}
            <button
              type="submit"
              disabled={names.length === 0}
              className="h-11 rounded-lg bg-fg text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Save line
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
