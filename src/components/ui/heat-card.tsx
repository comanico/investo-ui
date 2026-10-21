"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Cpu,
  Factory,
  Flame,
  HeartPulse,
  Landmark,
  Layers,
  Radio,
  Scale,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { formatRon, PACK_LABEL } from "@/lib/market";
import { useValuation } from "@/lib/session-provider";
import { formatSignedPct, heatFromStance, STANCE_LABEL } from "@/lib/valuation";
import type { EquityQuote, Pack } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PACK_ICONS: Record<Pack, LucideIcon> = {
  banks: Landmark,
  energy: Flame,
  utilities: Zap,
  industrial: Factory,
  real_estate: Building2,
  holding: Layers,
  consumer: ShoppingBag,
  healthcare: HeartPulse,
  telecom: Radio,
  technology: Cpu,
  financials_other: Scale,
};

const FLIP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Props = {
  item: EquityQuote;
  layout?: "tile" | "row";
};

export function HeatCard({ item, layout = "tile" }: Props) {
  const Icon = PACK_ICONS[item.pack];
  const valuation = useValuation(item.ticker);
  const { isUp, isDown } = heatFromStance(valuation?.stance);
  const heatMods = cn(isUp && "is-up", isDown && "is-down");
  const heat = cn("heat-tile", heatMods);
  const [hot, setHot] = useState(false);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const openProfile = () => {
    const href = `/${item.ticker}`;
    if (reduceMotion || typeof document.startViewTransition !== "function") {
      router.push(href);
      return;
    }
    document.startViewTransition(() => {
      router.push(href);
    });
  };

  if (layout === "row") {
    return (
      <button type="button" onClick={openProfile} className={cn(heat, "flex w-full flex-row items-center gap-3 p-3 text-left")}>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fg/10">
          <Icon className="size-5 text-fg/90" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-fg/60">{item.ticker}</p>
          <h2 className="truncate text-sm font-semibold leading-tight">{item.name}</h2>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums">{formatRon(item.price)}</span>
            <span className="text-xs text-fg/80">RON</span>
          </div>
          {valuation ? (
            <p className="text-xs font-medium text-fg/80">{STANCE_LABEL[valuation.stance]}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-fg/55">{PACK_LABEL[item.pack]}</span>
      </button>
    );
  }

  const flipped = hot && !reduceMotion;

  return (
    <motion.button
      type="button"
      onClick={openProfile}
      onHoverStart={() => setHot(true)}
      onHoverEnd={() => setHot(false)}
      className={cn(
        "heat-flip-scene heat-tile-face relative h-full min-h-0 w-full text-left",
        heatMods,
        hot && "is-hot",
      )}
    >
      <div className="heat-flip-glow">
        <motion.div
          className="heat-flip-inner"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          style={{ transformStyle: "preserve-3d" }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : hot
                ? { duration: 0.6, delay: 0.3, ease: FLIP_EASE }
                : { duration: 0.55, delay: 0, ease: FLIP_EASE }
          }
        >
          <div className={cn("heat-flip-face heat-flip-front heat-tile px-3 pt-5 pb-3", heatMods)}>
            <div className="flex shrink-0 justify-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-fg/10 sm:size-24">
                <Icon className="size-10 text-fg/90 sm:size-12" strokeWidth={1.5} />
              </div>
            </div>
            <div className="mt-4 flex min-h-0 w-full flex-1 flex-col justify-end space-y-0.5 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-fg/70">{item.ticker}</p>
              <h2 className="line-clamp-2 text-sm font-semibold leading-tight">
                {item.name}
              </h2>
              <div className="flex items-center justify-center gap-1 text-lg font-bold">
                <span className="tabular-nums">{formatRon(item.price)}</span>
                <span className="text-xs text-fg/80">RON</span>
              </div>
              {valuation ? (
                <p className="text-xs font-medium text-fg/80">{STANCE_LABEL[valuation.stance]}</p>
              ) : null}
            </div>
          </div>
          <div
            className={cn("heat-flip-face heat-flip-back heat-tile p-4", heatMods)}
            aria-hidden="true"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-fg/70">{item.ticker}</p>
            <h2 className="mt-1 text-sm font-semibold leading-tight sm:text-base">
              {valuation?.modelLabel ?? item.name}
            </h2>
            {valuation ? (
              <>
                <p className="mt-3 text-xl font-bold tabular-nums sm:text-2xl">
                  {formatRon(valuation.intrinsic)}
                  <span className="ml-1 text-sm font-medium text-fg/80"> RON</span>
                </p>
                <p className="text-xs text-fg/60">intrinsic</p>
                <p className="mt-3 text-sm font-semibold tabular-nums">
                  {formatSignedPct(valuation.upsidePct)} vs close
                </p>
                <p className="mt-auto pt-2 text-xs font-semibold uppercase tracking-wide text-fg/70">
                  {STANCE_LABEL[valuation.stance]}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-fg/70">{item.name}</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
}

