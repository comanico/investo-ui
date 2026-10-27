"use client";

import { AnimatePresence, motion } from "motion/react";
import type { NewsHit } from "@/lib/news";
import { cn } from "@/lib/utils";

export function SessionRegistry({
  items,
  title = "News",
  className,
}: {
  items: NewsHit[];
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel flex h-full min-h-0 max-h-full min-w-0 flex-col overflow-hidden p-4", className)}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg/50">{title}</h2>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <table className="w-full table-fixed caption-bottom text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="h-9 w-14 px-1.5 text-left font-medium text-fg/45">When</th>
              <th className="h-9 w-24 px-1.5 text-left font-medium text-fg/45">Ticker</th>
              <th className="h-9 min-w-0 px-2 text-left font-medium text-fg/45">Headline</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.tr
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.35 }}
                  className="border-b border-fg/5 align-top"
                >
                  <td className="px-1.5 py-2 text-fg/50 tabular-nums">
                    {new Date(item.at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  <td className="max-w-24 overflow-hidden px-1.5 py-2 font-medium whitespace-nowrap text-fg">
                    {item.ticker}
                  </td>
                  <td className="min-w-0 overflow-hidden px-2 py-2 break-words text-fg/90">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {item.headline}
                      </a>
                    ) : (
                      item.headline
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {!items.length && (
          <p className="py-8 text-center text-sm text-fg/40">No headlines for this desk.</p>
        )}
      </div>
    </div>
  );
}
