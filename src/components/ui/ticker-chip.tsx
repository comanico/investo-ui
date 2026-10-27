"use client";

import { TransitionLink } from "@/components/transition-link";
import { formatRon } from "@/lib/market";
import type { EquityQuote } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TickerChip({ quote }: { quote: EquityQuote }) {
  const prev = quote.prevClose;
  const isUp = prev != null && quote.price > prev;
  const isDown = prev != null && quote.price < prev;

  return (
    <TransitionLink
      href={`/${quote.ticker}`}
      className="relative z-10 flex items-baseline gap-2 whitespace-nowrap font-mono text-xs outline-none hover:opacity-80 focus-visible:underline"
    >
      <span className="font-semibold tracking-wide text-fg">{quote.ticker}</span>
      <span
        className={cn(
          "tabular-nums",
          isUp && "text-up",
          isDown && "text-down",
          !isUp && !isDown && "text-muted",
        )}
      >
        {formatRon(quote.price)}
        {prev != null ? <span className="text-muted"> / {formatRon(prev)}</span> : null}
      </span>
    </TransitionLink>
  );
}
