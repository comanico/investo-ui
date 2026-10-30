"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseSession } from "@/lib/supabase/use-session";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { user, pending } = useSupabaseSession();
  const [busy, setBusy] = useState(false);

  if (pending || !user) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void createClient()
          .auth.signOut()
          .then(() => {
            router.push("/construction");
            router.refresh();
          })
          .finally(() => setBusy(false));
      }}
      className={className}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
