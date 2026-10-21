export type ModelKind = "ri" | "fcff" | "ddm";

export type ValuationInput = { label: string; value: string };

export type ValuationResult = {
  ticker: string;
  model: ModelKind;
  modelLabel: string;
  formula: string;
  why: string;
  last: number;
  prevClose: number;
  dayPct: number;
  intrinsic: number;
  upsidePct: number;
  stance: "cheap" | "fair" | "rich";
  costOfEquity: number;
  inputs: ValuationInput[];
  asOf: string;
};

export type BackendModelRow = {
  symbol?: string;
  model?: string;
  status?: string;
  year?: string;
  beta?: number;
  risk_free_rate?: number;
  equity_risk_premium?: number;
  required_return?: number;
  g_short?: number;
  g_term?: number;
  d0?: number;
  d1?: number;
  fcf0?: number;
  fcf1?: number;
  wacc_proxy?: string;
  B0?: number;
  E0?: number;
  E1?: number;
  ROE0?: number;
  RI1?: number;
  price?: number;
  fair_value?: number;
  margin_of_safety?: number;
};

export const MODEL_LABEL: Record<ModelKind, string> = {
  ri: "Residual income",
  fcff: "FCFF",
  ddm: "Dividend discount",
};

export const STANCE_LABEL: Record<ValuationResult["stance"], string> = {
  cheap: "Undervalued",
  fair: "In range",
  rich: "Stretched",
};

export const MODEL_FORMULA: Record<ModelKind, string> = {
  ri: "B₀ + RI₁ / (rₑ − g)  ·  RI₁ = E₁ − rₑ B₀",
  fcff: "FCF₁ / (rₑ − g) / shares  ·  FCF = CFO − |CapEx|",
  ddm: "D₁ / (rₑ − g)",
};

export const MODEL_ORDER: ModelKind[] = ["ri", "fcff", "ddm"];

const BACKEND_MODEL: Record<string, ModelKind> = {
  ddm: "ddm",
  fcff: "fcff",
  residual_income: "ri",
  ri: "ri",
};

export function modelKindOf(raw: string | undefined): ModelKind | null {
  if (!raw) return null;
  return BACKEND_MODEL[raw] ?? null;
}

function pct(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function num(n: number | undefined, digits = 3): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function stanceOf(margin: number): ValuationResult["stance"] {
  if (margin > 0.12) return "cheap";
  if (margin < -0.12) return "rich";
  return "fair";
}

function whyOf(kind: ModelKind, year: string | undefined): string {
  const fy = year ? `FY${year}` : "the latest fiscal year";
  if (kind === "ddm") return `Gordon dividend discount on ${fy} dividends paid.`;
  if (kind === "fcff") return `Gordon FCFF on ${fy} operating cash flow minus CapEx, discounted at cost of equity.`;
  return `Gordon residual income on ${fy} book and earnings.`;
}

function inputsOf(kind: ModelKind, row: BackendModelRow): ValuationInput[] {
  const base: ValuationInput[] = [
    { label: "rₑ (CAPM)", value: pct(row.required_return) },
    { label: "Risk-free", value: pct(row.risk_free_rate) },
    { label: "ERP", value: pct(row.equity_risk_premium) },
    { label: "Beta", value: row.beta != null ? row.beta.toFixed(2) : "—" },
    { label: "g short", value: pct(row.g_short) },
    { label: "g term", value: pct(row.g_term) },
  ];
  if (kind === "ddm") {
    base.push({ label: "DPS₀", value: num(row.d0) }, { label: "DPS₁", value: num(row.d1) });
  }
  if (kind === "fcff") {
    base.push(
      { label: "FCF₀", value: row.fcf0 != null ? `${(row.fcf0 / 1e6).toFixed(0)} m` : "—" },
      { label: "FCF₁", value: row.fcf1 != null ? `${(row.fcf1 / 1e6).toFixed(0)} m` : "—" },
      { label: "Discount", value: row.wacc_proxy === "r_e" ? "rₑ (no WACC)" : (row.wacc_proxy ?? "—") },
    );
  }
  if (kind === "ri") {
    base.push(
      { label: "Book / sh", value: num(row.B0) },
      { label: "EPS₀", value: num(row.E0) },
      { label: "ROE", value: pct(row.ROE0) },
      { label: "RI₁", value: num(row.RI1) },
    );
  }
  return base;
}

/** Map a backend model row onto the card. Does not recompute fair value. */
export function valuationFromBackend(row: BackendModelRow, asOf: string): ValuationResult | null {
  const kind = modelKindOf(row.model);
  if (!kind || row.status !== "ok") return null;
  const last = Number(row.price);
  const intrinsic = Number(row.fair_value);
  if (!Number.isFinite(last) || !Number.isFinite(intrinsic)) return null;
  const margin = Number(row.margin_of_safety);
  const upsidePct = Number.isFinite(margin) ? margin * 100 : last === 0 ? 0 : ((intrinsic - last) / last) * 100;
  return {
    ticker: (row.symbol ?? "").toUpperCase(),
    model: kind,
    modelLabel: MODEL_LABEL[kind],
    formula: MODEL_FORMULA[kind],
    why: whyOf(kind, row.year),
    last,
    prevClose: last,
    dayPct: 0,
    intrinsic,
    upsidePct,
    stance: stanceOf(Number.isFinite(margin) ? margin : upsidePct / 100),
    costOfEquity: Number(row.required_return) || 0,
    inputs: inputsOf(kind, row),
    asOf: row.year ? `${asOf} · FY${row.year}` : asOf,
  };
}

export function formatSignedPct(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;
}

/** Green when cheap or fair; red when stretched. Neutral if no model. */
export function heatFromStance(stance: ValuationResult["stance"] | undefined): {
  isUp: boolean;
  isDown: boolean;
} {
  if (stance === "rich") return { isUp: false, isDown: true };
  if (stance === "cheap" || stance === "fair") return { isUp: true, isDown: false };
  return { isUp: false, isDown: false };
}
