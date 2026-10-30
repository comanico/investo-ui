"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthModal } from "./auth-modal";

export function ConstructionGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg px-6">
      <h1 className="wordmark text-6xl leading-none sm:text-7xl">Investo</h1>
      <p className="mt-6 text-sm font-medium uppercase tracking-wide text-fg/45">Under construction</p>
      <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-fg/70">
        This terminal is not open yet. Come back when the book is ready.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 text-xs font-medium uppercase tracking-wide text-fg/35 transition-colors hover:text-fg/70"
      >
        Team sign in
      </button>
      <AuthModal
        open={open}
        title="Investo"
        description="Sign in with email and password."
        allowSignUp={false}
        onClose={() => setOpen(false)}
        onSignedIn={() => {
          setOpen(false);
          router.push("/");
          router.refresh();
        }}
      />
    </main>
  );
}
