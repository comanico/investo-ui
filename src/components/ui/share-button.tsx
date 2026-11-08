"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ShareButton({
  disabled,
  className,
  request,
  idle = "Share",
  pending = "Sharing…",
  fallbackName = "share.png",
}: {
  disabled?: boolean;
  className?: string;
  request: () => Promise<Response>;
  idle?: string;
  pending?: string;
  fallbackName?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => {
        setBusy(true);
        void request()
          .then(async (res) => {
            if (!res.ok) return;
            const blob = await res.blob();
            const match = /filename="?([^"]+)"?/i.exec(res.headers.get("Content-Disposition") ?? "");
            const name = match?.[1] ?? fallbackName;
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = name;
            link.click();
            URL.revokeObjectURL(href);
          })
          .finally(() => setBusy(false));
      }}
      className={cn(
        "rounded-full border border-white/55 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-bg shadow-[0_0_24px_rgb(255_255_255/0.18)] backdrop-blur-md hover:bg-white/85 hover:border-white/70 disabled:opacity-40",
        className,
      )}
    >
      {busy ? pending : idle}
    </button>
  );
}
