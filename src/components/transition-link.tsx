"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

export function TransitionLink({ href, onClick, ...rest }: Props) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced || typeof document.startViewTransition !== "function") return;
        event.preventDefault();
        const target = typeof href === "string" ? href : (href.pathname ?? "/");
        document.startViewTransition(() => {
          router.push(target);
        });
      }}
      {...rest}
    />
  );
}
