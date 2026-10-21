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
    <div className={cn("glass-panel flex h-full max-h-full flex-col p-4", className)}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg/50">{title}</h2>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="h-9 px-2 text-left font-medium text-fg/45">When</th>
              <th className="h-9 px-2 text-left font-medium text-fg/45">Ticker</th>
              <th className="h-9 px-2 text-left font-medium text-fg/45">Headline</th>
              <th className="h-9 px-2 text-left font-medium text-fg/45">Source</th>
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
                  <td className="px-2 py-2 whitespace-nowrap text-fg/50 tabular-nums">
                    {new Date(item.at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  <td className="px-2 py-2 font-medium text-fg">{item.ticker}</td>
                  <td className="px-2 py-2 text-fg/90">{item.headline}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-fg/55">{item.source}</td>
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
