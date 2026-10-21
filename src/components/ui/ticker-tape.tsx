import type { EquityQuote } from "@/lib/types";
import { InfiniteSlider } from "./infinite-slider";
import { TickerChip } from "./ticker-chip";

export function TickerTape({ names }: { names: EquityQuote[] }) {
  if (names.length === 0) return null;
  return (
    <InfiniteSlider gap={48} speed={42} speedOnHover={18}>
      {names.map((quote) => (
        <TickerChip key={quote.ticker} quote={quote} />
      ))}
    </InfiniteSlider>
  );
}
