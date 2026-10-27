"use client";

import { useId, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRon } from "@/lib/market";
import { useSession } from "@/lib/session-store";
import type { PriceTick } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_SERIES: PriceTick[] = [];

const RANGES = [
  { id: "6m", months: 6, label: "6M" },
  { id: "1y", months: 12, label: "1Y" },
  { id: "5y", months: 60, label: "5Y" },
] as const;

type ChartRange = (typeof RANGES)[number]["id"];

function monthsAgo(from: number, months: number) {
  const stamp = new Date(from);
  stamp.setMonth(stamp.getMonth() - months);
  return stamp.getTime();
}

function sliceRange(series: PriceTick[], months: number): PriceTick[] {
  const end = series.at(-1)?.t;
  if (end == null) return series;
  const start = monthsAgo(end, months);
  const sliced = series.filter((row) => row.t >= start);
  return sliced.length > 0 ? sliced : series;
}

function formatAxisDate(value: number, months: number) {
  if (months <= 6) {
    return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  return new Date(value).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatTipDate(value: number) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function yDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.abs(min) * 0.04, 0.02);
  const pad = span * 0.18;
  return [min - pad, max + pad];
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: number;
}) {
  if (!active || !payload?.length || payload[0]?.value == null) return null;
  return (
    <div className="chart-tip">
      <p className="text-xs text-fg/55">{formatTipDate(Number(label))}</p>
      <p className="mt-1 font-mono text-sm font-medium tabular-nums">
        {formatRon(Number(payload[0].value))} RON
      </p>
    </div>
  );
}

export function PriceChart({
  ticker,
  name,
  series: seriesProp,
  className,
}: {
  ticker: string;
  name: string;
  series?: PriceTick[];
  className?: string;
}) {
  const fromStore = useSession((s) => s.history[ticker] ?? EMPTY_SERIES);
  const full = seriesProp ?? fromStore;
  const [range, setRange] = useState<ChartRange>("1y");
  const months = RANGES.find((row) => row.id === range)?.months ?? 12;
  const series = useMemo(() => sliceRange(full, months), [full, months]);
  const last = series.at(-1)?.p;
  const first = series[0]?.p;
  const isUp = last != null && first != null && last > first;
  const isDown = last != null && first != null && last < first;
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const fillId = `fill-${ticker}-${uid}`;
  const domain = useMemo(() => yDomain(series.map((row) => row.p)), [series]);
  const stroke = isUp ? "var(--color-up)" : isDown ? "var(--color-down)" : "var(--color-fg)";
  const yDigits = (domain[1] ?? 0) < 2 ? 3 : 2;
  const dense = series.length > 80;

  if (full.length === 0) return null;

  return (
    <section
      className={cn("price-chart-shell glass-panel relative overflow-hidden p-4", className)}
      aria-label={`${ticker} daily close`}
    >
      <div className="relative mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg/45">Daily close</p>
          <p className="text-lg font-semibold">{name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Chart range"
            className="flex rounded-full bg-fg/10 p-1"
          >
            {RANGES.map((row) => (
              <button
                key={row.id}
                type="button"
                aria-pressed={range === row.id}
                onClick={() => setRange(row.id)}
                className={cn(
                  "min-h-8 rounded-full px-3 text-xs font-semibold uppercase tracking-wide transition-colors",
                  range === row.id ? "bg-fg/15 text-fg" : "text-fg/50 hover:text-fg/80",
                )}
              >
                {row.label}
              </button>
            ))}
          </div>
          {last != null && (
            <p className="text-xl font-semibold tabular-nums">
              {formatRon(last)} <span className="text-sm font-medium text-fg/55">RON</span>
            </p>
          )}
        </div>
      </div>
      <div className="price-chart relative h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart key={range} data={series} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--color-chart-grid)"
              strokeDasharray="3 10"
              vertical
              horizontal
            />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={months <= 6 ? 32 : 48}
              tickFormatter={(value: number) => formatAxisDate(value, months)}
            />
            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={44}
              tickCount={5}
              tickFormatter={(value: number) => Number(value).toFixed(yDigits)}
            />
            <Tooltip
              content={<ChartTip />}
              cursor={{ stroke: "var(--color-line)", strokeDasharray: "3 6" }}
            />
            <Area
              type="monotone"
              dataKey="p"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${fillId})`}
              style={{ filter: `drop-shadow(0 0 8px ${stroke})` }}
              dot={dense ? false : { r: 3, fill: stroke, stroke: "rgb(255 255 255 / 0.7)", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
              isAnimationActive={!reduce && !dense}
              animationDuration={reduce || dense ? 0 : 400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
