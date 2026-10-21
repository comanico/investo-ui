"use client";

import { ArrowLeft } from "lucide-react";
import { TransitionLink } from "@/components/transition-link";
import { PACK_ICONS } from "./heat-card";
import { AiBrief } from "./ai-brief";
import { SessionRegistry } from "./session-registry";
import { ModelFormulas, ValuationCard } from "./valuation-card";
import { COMPANY_VENUE } from "@/lib/profiles";
import { formatRon, PACK_LABEL } from "@/lib/market";
import { formatSignedPct, heatFromStance, STANCE_LABEL } from "@/lib/valuation";
import { newsFor } from "@/lib/news";
import { useNames, useNews, useValuation } from "@/lib/session-provider";
import { cn } from "@/lib/utils";

export function CompanyProfile({ ticker }: { ticker: string }) {
  const names = useNames();
  const news = useNews();
  const valuation = useValuation(ticker);
  const quote = names.find((row) => row.ticker.toUpperCase() === ticker.toUpperCase());

  if (!quote) {
    return (
      <main className="flex flex-1 flex-col items-start gap-4 px-4 pb-8">
        <BackLink />
        <div className="glass-panel w-full max-w-lg p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-fg/55">Unknown name</p>
          <h1 className="mt-2 text-2xl font-semibold">{ticker}</h1>
          <p className="mt-3 text-sm text-fg/70">This ticker is not loaded yet.</p>
        </div>
      </main>
    );
  }

  const Icon = PACK_ICONS[quote.pack];
  const { isUp, isDown } = heatFromStance(valuation?.stance);
  const blurb = quote.blurb;
  const mine = newsFor([quote.ticker], news);

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 lg:flex-row lg:overflow-hidden">
      <div className="min-w-0 flex-1 space-y-4 lg:overflow-y-auto lg:pr-1">
        <BackLink />
        <section
          className={cn(
            "heat-tile p-5 sm:p-6",
            isUp && "is-up",
            isDown && "is-down",
          )}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-fg/10 sm:size-20">
              <Icon className="size-8 text-fg/90 sm:size-10" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-fg/70">{quote.ticker}</p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">{quote.name}</h1>
              <p className="mt-2 text-sm text-fg/65">
                {PACK_LABEL[quote.pack]} · {COMPANY_VENUE}
              </p>
            </div>
            <div className="sm:text-right">
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="text-3xl font-bold tabular-nums">{formatRon(quote.price)}</span>
                <span className="text-sm text-fg/75">RON</span>
              </div>
              {valuation ? (
                <p className="mt-1 text-sm font-medium text-fg/80">
                  {STANCE_LABEL[valuation.stance]}
                  <span className="ml-2 tabular-nums text-fg/60">{formatSignedPct(valuation.upsidePct)} vs close</span>
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Last" value={`${formatRon(quote.price)} RON`} />
          <Stat label="As of" value={quote.asOf ?? "—"} />
          <Stat
            label="vs close"
            value={valuation ? formatSignedPct(valuation.upsidePct) : "—"}
          />
          <Stat label="Pack" value={PACK_LABEL[quote.pack]} />
        </div>

        <AiBrief quote={quote} blurb={blurb} valuation={valuation} news={mine} />

        {valuation ? <ValuationCard value={valuation} /> : <ModelFormulas />}

        {blurb ? (
          <section className="glass-panel p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/50">Profile</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg/80">{blurb}</p>
          </section>
        ) : null}
      </div>
      <aside className="h-80 shrink-0 lg:h-auto lg:w-rail">
        <SessionRegistry items={mine} title={`${quote.ticker} news`} />
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

function BackLink() {
  return (
    <TransitionLink
      href="/"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-fg/70 transition-colors duration-200 hover:text-fg"
    >
      <ArrowLeft className="size-4" strokeWidth={1.75} />
      Heat
    </TransitionLink>
  );
}
