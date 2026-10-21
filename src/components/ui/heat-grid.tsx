import type { EquityQuote } from "@/lib/types";
import { HeatCard } from "./heat-card";

export function HeatGrid({ items }: { items: EquityQuote[] }) {
  return (
    <div className="grid w-full auto-rows-fr grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => (
        <HeatCard key={item.ticker} item={item} />
      ))}
    </div>
  );
}
