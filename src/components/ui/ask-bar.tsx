"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { matchDeskName, suggestDeskNames } from "@/lib/ask";
import { useNames } from "@/lib/session-provider";

export function AskBar() {
  const router = useRouter();
  const names = useNames();
  const [q, setQ] = useState("");
  const [looking, setLooking] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [offTopic, setOffTopic] = useState<string | null>(null);

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
    <div className="flex w-full max-w-2xl flex-col items-stretch gap-4">
      <form className="relative" onSubmit={(event) => void onSubmit(event)}>
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
          className="glass-panel h-14 w-full px-5 text-base text-fg outline-none placeholder:text-fg/40 focus:border-fg/30"
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
      {looking ? <p className="text-sm text-fg/55">Looking…</p> : null}
      {offTopic ? (
        <div className="glass-panel p-5">
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
        <div className="glass-panel p-5">
          <p className="text-sm leading-relaxed text-fg/80 text-pretty">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}
