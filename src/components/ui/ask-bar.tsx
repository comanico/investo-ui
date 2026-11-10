"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { capabilityReply, matchDeskName, suggestDeskNames } from "@/lib/ask";
import { useNames, useValuations } from "@/lib/session-provider";
import { mostUndervalued } from "@/lib/valuation";
import { HeatCard } from "./heat-card";

export function AskBar() {
  const router = useRouter();
  const names = useNames();
  const valuations = useValuations();
  const reduceMotion = useReducedMotion();
  const [q, setQ] = useState("");
  const [looking, setLooking] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [offTopic, setOffTopic] = useState<string | null>(null);
  const [showPicks, setShowPicks] = useState(false);
  const picks = useMemo(
    () => (showPicks ? mostUndervalued(names, valuations, 3) : []),
    [names, showPicks, valuations],
  );

  const suggestions = useMemo(() => suggestDeskNames(q, names), [q, names]);
  const showList = open && suggestions.length > 0 && !looking;

  function go(ticker: string) {
    setOpen(false);
    router.push(`/${ticker}`);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (showList && suggestions[active]) {
      go(suggestions[active]!.ticker);
      return;
    }
    const query = q.trim();
    if (!query) return;
    const ticker = matchDeskName(query, names);
    if (ticker) {
      go(ticker);
      return;
    }
    setLooking(true);
    setOpen(false);
    setAnswer(null);
    setOffTopic(null);
    setShowPicks(false);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const body = (await res.json()) as { answer?: string; offTopic?: boolean };
      if (body.offTopic) {
        setOffTopic(query);
        return;
      }
      if (typeof body.answer === "string" && body.answer.trim()) {
        setAnswer(body.answer.trim());
        setShowPicks(capabilityReply(query) !== null);
      }
    } finally {
      setLooking(false);
    }
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex w-full max-w-5xl flex-col items-stretch gap-4">
      <form className="relative mx-auto w-full max-w-2xl" onSubmit={(event) => void onSubmit(event)}>
        <label className="sr-only" htmlFor="ask">
          Search
        </label>
        <input
          id="ask"
          value={q}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls="ask-suggestions"
          onChange={(event) => {
            setQ(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKey}
          placeholder="TLV, or how is Banca Transilvania valued?"
          className="h-14 w-full rounded-3xl border border-white/45 bg-white/12 px-5 text-base text-fg shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_8px_28px_rgb(0_0_0/0.35)] outline-none placeholder:text-white/55 focus:border-white/70 focus:bg-white/16"
        />
        {showList ? (
          <ul
            id="ask-suggestions"
            role="listbox"
            className="glass-panel absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden py-1"
          >
            {suggestions.map((row, index) => (
              <li key={row.ticker} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => go(row.ticker)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex w-full items-baseline gap-3 px-5 py-2.5 text-left text-sm ${
                    index === active ? "bg-fg/10" : ""
                  }`}
                >
                  <span className="w-16 shrink-0 font-semibold tracking-wide">{row.ticker}</span>
                  <span className="min-w-0 truncate text-fg/65">{row.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
      {looking ? <p className="mx-auto w-full max-w-2xl text-sm text-fg/55">Looking…</p> : null}
      {offTopic ? (
        <div className="glass-panel mx-auto w-full max-w-2xl p-5">
          <p className="text-sm leading-relaxed text-fg/80">That one is outside the book.</p>
          <a
            href={`https://grok.com/?q=${encodeURIComponent(offTopic)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-fg/70 underline-offset-2 hover:text-fg hover:underline"
          >
            Ask on grok.com
          </a>
        </div>
      ) : null}
      {answer ? (
        <div className="glass-panel mx-auto w-full max-w-2xl p-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-fg/80 text-pretty">{answer}</p>
        </div>
      ) : null}
      {picks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {picks.map((item, index) => (
            <motion.div
              key={item.ticker}
              initial={reduceMotion ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.5, delay: 0.08 + index * 0.08, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <HeatCard item={item} prominent />
            </motion.div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
