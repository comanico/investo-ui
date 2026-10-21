"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { briefCompany } from "@/lib/brief";
import type { NewsHit } from "@/lib/news";
import type { EquityQuote } from "@/lib/types";
import type { ValuationResult } from "@/lib/valuation";

const TICK_MS = 12;

export function AiBrief({
  quote,
  blurb,
  valuation,
  news,
}: {
  quote: EquityQuote;
  blurb?: string;
  valuation: ValuationResult | null;
  news: NewsHit[];
}) {
  const brief = briefCompany(quote, blurb, valuation, news);
  const parts = [brief.profile, brief.valuation, brief.market];
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState(0);
  const total = parts.reduce((sum, part) => sum + part.length, 0);

  useEffect(() => {
    setVisible(false);
    setTyped(0);
  }, [quote.ticker]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || reduceMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion, quote.ticker]);

  useEffect(() => {
    if (reduceMotion || !visible) return;
    const id = window.setInterval(() => {
      setTyped((count) => {
        if (count >= total) {
          window.clearInterval(id);
          return count;
        }
        return count + 1;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, visible, total]);

  const shown = reduceMotion ? total : typed;
  let cursor = shown;
  const slices = parts.map((part) => {
    const take = Math.max(0, Math.min(part.length, cursor));
    cursor -= take;
    return part.slice(0, take);
  });
  const active =
    !reduceMotion && visible && shown < total
      ? slices.findIndex((slice, index) => slice.length < parts[index]!.length)
      : -1;

  return (
    <section ref={sectionRef} className="glass-panel p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-fg/50">AI</p>
      <h2 className="mt-1 text-lg font-semibold">How this name reads</h2>
      <div className="mt-5 space-y-4">
        <Block label="Profile" text={parts[0]!} shown={slices[0]!} caret={active === 0} />
        <Block label="How the value is built" text={parts[1]!} shown={slices[1]!} caret={active === 1} />
        <Block label="How the market sees it" text={parts[2]!} shown={slices[2]!} caret={active === 2} />
      </div>
      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-fg/50">Sources</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {brief.sources.map((source) => (
          <li key={`${source.label}-${source.detail}`} className="flex flex-wrap gap-x-2 text-xs">
            <span className="font-medium text-fg/80">{source.label}</span>
            <span className="text-fg/45">{source.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Block({
  label,
  text,
  shown,
  caret,
}: {
  label: string;
  text: string;
  shown: string;
  caret: boolean;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fg/50">{label}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg/80 text-pretty">
        <span className="sr-only">{text}</span>
        <span aria-hidden>
          {shown}
          {caret ? <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 animate-pulse bg-fg/80" /> : null}
        </span>
      </p>
    </div>
  );
}
