"use client";

import { useNames } from "@/lib/session-provider";
import { TransitionLink } from "@/components/transition-link";
import { BookButton } from "./book-gate";
import { SignOutButton } from "./sign-out-button";
import { TickerTape } from "./ticker-tape";

export function SiteHeader() {
  const names = useNames();

  return (
    <header className="site-header z-10 flex h-16 shrink-0 items-center gap-8 overflow-hidden px-5 lg:px-6">
      <TransitionLink href="/" className="wordmark relative z-20 shrink-0 text-2xl leading-none lg:text-3xl">
        Investo
      </TransitionLink>
      <TransitionLink
        href="/heat"
        className="relative z-20 shrink-0 text-sm font-medium text-fg/70 transition-colors hover:text-fg"
      >
        Heat
      </TransitionLink>
      <BookButton className="relative z-20 shrink-0 text-sm font-medium text-fg/70 transition-colors hover:text-fg disabled:opacity-50" />
      <SignOutButton className="relative z-20 shrink-0 text-sm font-medium text-fg/70 transition-colors hover:text-fg disabled:opacity-50" />
      <div className="tape-mask min-w-0 flex-1">
        <TickerTape names={names} />
      </div>
    </header>
  );
}
