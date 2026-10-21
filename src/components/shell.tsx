"use client";

import type { ReactNode } from "react";
import type { NewsHit } from "@/lib/news";
import type { EquityQuote } from "@/lib/types";
import type { ValuationResult } from "@/lib/valuation";
import { SessionProvider } from "@/lib/session-provider";
import { SiteHeader } from "./ui/site-header";

export function Shell({
  names,
  valuations,
  news,
  children,
}: {
  names: EquityQuote[];
  valuations: Record<string, ValuationResult>;
  news: NewsHit[];
  children: ReactNode;
}) {
  return (
    <SessionProvider names={names} valuations={valuations} news={news}>
      <div className="stardust relative flex min-h-dvh flex-col overflow-x-hidden text-fg xl:h-dvh xl:overflow-hidden">
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <SiteHeader />
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
