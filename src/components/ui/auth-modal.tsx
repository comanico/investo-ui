"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthModal({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError(null);
      setNote(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(mode: "in" | "up") {
    setBusy(true);
    setError(null);
    setNote(null);
    const supabase = createClient();
    const result =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (!result.data.session) {
      setNote("Check your email to confirm the account, then sign in.");
      return;
    }
    onSignedIn();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-login-title"
        className="glass-panel w-full max-w-sm p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="book-login-title" className="wordmark text-3xl leading-none">
          Book
        </h2>
        <p className="mt-2 text-sm text-fg/55">Sign in with email and password to open your book.</p>

        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit("in");
          }}
        >
          <label className="text-xs font-medium uppercase tracking-wide text-fg/50">
            Email
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-fg/50">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
            />
          </label>
          {error ? <p className="text-sm text-down">{error}</p> : null}
          {note ? <p className="text-sm text-fg/70">{note}</p> : null}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-fg px-3 py-2 text-sm font-medium text-bg disabled:opacity-50"
            >
              Sign in
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit("up")}
              className="flex-1 rounded-xl border border-line px-3 py-2 text-sm text-fg/80 disabled:opacity-50"
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
