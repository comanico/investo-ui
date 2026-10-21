"use client";

import { DESKS, namesInDesk } from "@/lib/market";
import { newsFor } from "@/lib/news";
import { useNames, useNews } from "@/lib/session-provider";
import { HeatCard } from "./heat-card";
import { SessionRegistry } from "./session-registry";
import { ModelFormulas } from "./valuation-card";

export function HeatBoard() {
  const names = useNames();
  const news = useNews();

  const desks = DESKS.map((desk) => {
    const items = namesInDesk(names, desk);
    return { desk, items };
  }).filter((row) => row.items.length > 0);

  if (desks.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-10 lg:flex-row lg:items-start">
        <div className="glass-panel mt-6 w-full max-w-lg p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-fg/45">Heat</p>
          <h2 className="mt-2 text-2xl font-semibold">No names loaded</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg/70">
            Quotes and valuations come from the backend import. This board stays empty until that feed is wired.
          </p>
        </div>
        <div className="mt-6 w-full max-w-lg">
          <ModelFormulas />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-10">
      <div className="flex w-full flex-col gap-10">
        {desks.map(({ desk, items }) => {
          const tape = newsFor(items.map((item) => item.ticker), news);
          return (
            <section key={desk.id} className="flex flex-col gap-4">
              <header className="flex items-baseline justify-between gap-3 px-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg/45">
                    {desk.kind === "trending" ? "Trending" : "Industry"}
                  </p>
                  <h2 className="wordmark text-3xl leading-none">{desk.title}</h2>
                </div>
                <p className="text-xs tabular-nums text-fg/45">{items.length} names</p>
              </header>
              <div className="relative">
                <div className="flex items-center gap-4 overflow-x-auto py-3 pl-4 pr-[22rem] sm:pr-[28rem]">
                  {items.map((item) => (
                    <div key={item.ticker} className="aspect-square h-56 shrink-0 sm:h-64">
                      <HeatCard item={item} />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-y-3 right-0 z-10 w-80 sm:w-[26rem]">
                  <div className="pointer-events-none absolute inset-y-0 -left-12 w-12 bg-gradient-to-r from-transparent to-bg" />
                  <SessionRegistry
                    items={tape}
                    title={`${desk.title} registry`}
                    className="registry-dock h-full min-h-0 w-full"
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
