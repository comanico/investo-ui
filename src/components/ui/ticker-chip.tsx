import { formatRon } from "@/lib/market";
import type { EquityQuote } from "@/lib/types";

export function TickerChip({ quote }: { quote: EquityQuote }) {
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap font-mono text-xs">
      <span className="font-semibold tracking-wide">{quote.ticker}</span>
      <span className="text-muted">{formatRon(quote.price)}</span>
    </span>
  );
}
