"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSupabaseSession } from "@/lib/supabase/use-session";
import { AuthModal } from "./auth-modal";

export function BookButton({ className }: { className?: string }) {
  const router = useRouter();
  const { user, pending } = useSupabaseSession();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (user) {
            router.push("/portfolio");
            return;
          }
          setOpen(true);
        }}
        className={className}
      >
        Book
      </button>
      <AuthModal
        open={open}
        onClose={() => setOpen(false)}
        onSignedIn={() => {
          setOpen(false);
          router.push("/portfolio");
          router.refresh();
        }}
      />
    </>
  );
}

export function BookPageGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, pending } = useSupabaseSession();

  if (pending) {
    return <p className="px-4 py-8 text-sm text-fg/55">Checking the book…</p>;
  }

  if (!user) {
    return (
      <AuthModal
        open
        onClose={() => router.push("/")}
        onSignedIn={() => router.refresh()}
      />
    );
  }

  return <>{children}</>;
}
