import React, { type ReactNode } from "react";
import type { NewsLine } from "./brief";
import { formatRon } from "./market";
import { chartGeom, parseShareLots, type ChartGeom, type ShareLot } from "./share-chart";
import type { PriceTick } from "./types";
import { formatSignedPct, STANCE_LABEL, type ValuationResult } from "./valuation";

const BG = "#050506";
const FG = "#f4f4f5";
const MUTED = "rgba(244, 244, 245, 0.5)";
const UP = "#3cb371";
const DOWN = "#ff4500";

export type BookShareTop = { ticker: string; pnlPct: number };

export type BookShareBody = {
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  dayPct: number;
  names: number;
  top: BookShareTop[];
  lots: ShareLot[];
};

function tone(n: number): string {
  if (n > 0) return UP;
  if (n < 0) return DOWN;
  return FG;
}

function stanceColor(stance: ValuationResult["stance"]): string {
  if (stance === "cheap") return UP;
  if (stance === "rich") return DOWN;
  return FG;
}

function Wordmark() {
  return (
    <div
      style={{
        fontFamily: "Big Shoulders Display",
        fontSize: 48,
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color: FG,
        lineHeight: 1,
      }}
    >
      Investo
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "IBM Plex Sans",
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: MUTED,
      }}
    >
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  color = FG,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div
          style={{
            fontFamily: "IBM Plex Sans",
            fontSize: 36,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {unit ? (
          <div
            style={{
              fontFamily: "IBM Plex Sans",
              fontSize: 18,
              fontWeight: 500,
              color: MUTED,
            }}
          >
            {unit}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function clip(text: string, max = 280): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const at = slice.lastIndexOf(" ");
  return `${(at > 80 ? slice.slice(0, at) : slice).trim()}…`;
}

function ShareChart({ series, label, height }: { series: PriceTick[]; label: string; height?: number }) {
  const geom: ChartGeom | null = chartGeom(series, 920, height ?? 300);
  if (!geom) return null;
  const color = geom.up ? UP : geom.down ? DOWN : FG;
  const fill = geom.up ? "rgba(60, 179, 113, 0.28)" : geom.down ? "rgba(255, 69, 0, 0.28)" : "rgba(244, 244, 245, 0.12)";
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 28, width: geom.width }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
        <Label>{label}</Label>
        <div
          style={{
            fontFamily: "IBM Plex Sans",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          1Y
        </div>
      </div>
      <svg width={geom.width} height={geom.height} viewBox={`0 0 ${geom.width} ${geom.height}`}>
        <path d={geom.area} fill={fill} />
        <path d={geom.line} fill="none" stroke={color} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 16, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
          {geom.startLabel}
        </div>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 16, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
          {geom.endLabel}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        background: BG,
        color: FG,
        padding: 64,
        fontFamily: "IBM Plex Sans",
      }}
    >
      <Wordmark />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 36 }}>{children}</div>
    </div>
  );
}

export function CompanyShareCard({
  name,
  value,
  series,
  headlines = [],
}: {
  name: string;
  value: ValuationResult;
  series: PriceTick[];
  headlines?: NewsLine[];
}) {
  const vs = formatSignedPct(value.upsidePct);
  const lines = headlines.slice(0, 3);
  return (
    <Shell>
      <Label>{value.ticker}</Label>
      <div
        style={{
          fontFamily: "IBM Plex Sans",
          fontSize: 48,
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: 8,
          maxWidth: 920,
        }}
      >
        {name}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 22, fontWeight: 500, color: MUTED }}>
          {value.modelLabel}
        </div>
        <div
          style={{
            fontFamily: "IBM Plex Sans",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: stanceColor(value.stance),
            border: `1px solid ${stanceColor(value.stance)}`,
            borderRadius: 999,
            padding: "6px 16px",
          }}
        >
          {STANCE_LABEL[value.stance]}
        </div>
      </div>
      <ShareChart series={series} label="Close" height={lines.length ? 200 : 300} />
      <div style={{ display: "flex", gap: 28, marginTop: 24 }}>
        <Metric label="Intrinsic" value={formatRon(value.intrinsic)} unit="RON" />
        <Metric label="Close" value={formatRon(value.last)} unit="RON" />
        <Metric label="vs close" value={vs} color={tone(value.upsidePct)} />
      </div>
      {lines.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28, width: 920 }}>
          <Label>How the market sees it</Label>
          {lines.map((line) => (
            <div
              key={`${line.title}-${line.date}-${line.source}`}
              style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "flex-start" }}
            >
              <div
                style={{
                  fontFamily: "IBM Plex Sans",
                  fontSize: 22,
                  color: MUTED,
                  lineHeight: 1.35,
                }}
              >
                •
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  flex: 1,
                  fontFamily: "IBM Plex Sans",
                  fontSize: 20,
                  lineHeight: 1.35,
                  color: "rgba(244, 244, 245, 0.88)",
                }}
              >
                <div>{clip(line.title, 96)}</div>
                <div style={{ color: MUTED }}>{line.date}</div>
                <div style={{ color: MUTED }}>{line.source}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}

export function BookShareCard({ book, series }: { book: BookShareBody; series: PriceTick[] }) {
  const count = Math.max(0, Math.floor(book.names));
  const vsCost = formatSignedPct(book.pnlPct);
  const day = formatSignedPct(book.dayPct);
  const value = book.value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const namesLabel = `${count} ${count === 1 ? "name" : "names"}`;
  const top = book.top.slice(0, 3);

  return (
    <Shell>
      <Label>You</Label>
      <div
        style={{
          fontFamily: "IBM Plex Sans",
          fontSize: 52,
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: 8,
        }}
      >
        Your book
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}>
        <div
          style={{
            fontFamily: "IBM Plex Sans",
            fontSize: 56,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 22, fontWeight: 500, color: MUTED }}>RON</div>
      </div>
      <ShareChart series={series} label="Book value" />
      <div style={{ display: "flex", gap: 28, marginTop: 20 }}>
        <Metric label="vs cost" value={vsCost} color={tone(book.pnlPct)} />
        <Metric label="Day" value={day} color={tone(book.dayPct)} />
        <Metric label="Names" value={namesLabel} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
        {top.map((row) => (
          <div key={row.ticker} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontFamily: "IBM Plex Sans",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {row.ticker}
            </div>
            <div
              style={{
                fontFamily: "IBM Plex Sans",
                fontSize: 28,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: tone(row.pnlPct),
              }}
            >
              {formatSignedPct(row.pnlPct)}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseBookShare(body: unknown): BookShareBody | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (row.kind !== "book") return null;
  if (
    !isFiniteNumber(row.value) ||
    !isFiniteNumber(row.cost) ||
    !isFiniteNumber(row.pnl) ||
    !isFiniteNumber(row.pnlPct) ||
    !isFiniteNumber(row.dayPct) ||
    !isFiniteNumber(row.names)
  ) {
    return null;
  }
  if (!Array.isArray(row.top)) return null;
  const top: BookShareTop[] = [];
  for (const item of row.top.slice(0, 3)) {
    if (!item || typeof item !== "object") continue;
    const line = item as Record<string, unknown>;
    const ticker = typeof line.ticker === "string" ? line.ticker.trim().toUpperCase() : "";
    if (!ticker || !isFiniteNumber(line.pnlPct)) continue;
    top.push({ ticker, pnlPct: line.pnlPct });
  }
  return {
    value: row.value,
    cost: row.cost,
    pnl: row.pnl,
    pnlPct: row.pnlPct,
    dayPct: row.dayPct,
    names: row.names,
    top,
    lots: parseShareLots(row.lots),
  };
}
