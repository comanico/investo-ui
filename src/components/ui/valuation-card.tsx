import { formatRon } from "@/lib/market";
import {
  MODEL_FORMULA,
  MODEL_LABEL,
  MODEL_ORDER,
  formatSignedPct,
  STANCE_LABEL,
  type ValuationResult,
} from "@/lib/valuation";
import { cn } from "@/lib/utils";

export function ValuationCard({ value }: { value: ValuationResult }) {
  const up = value.upsidePct > 0;
  const down = value.upsidePct < 0;

  return (
    <section className="glass-panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg/50">Valuation</p>
          <h2 className="mt-1 text-lg font-semibold">{value.modelLabel}</h2>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            value.stance === "cheap" && "bg-up/15 text-up",
            value.stance === "rich" && "bg-down/15 text-down",
            value.stance === "fair" && "bg-fg/10 text-fg/80",
          )}
        >
          {STANCE_LABEL[value.stance]}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <Metric label="Intrinsic" value={formatRon(value.intrinsic)} unit="RON" />
        <Metric label="Close" value={formatRon(value.last)} unit="RON" />
        <Metric
          label="vs close"
          value={formatSignedPct(value.upsidePct)}
          tone={up ? "up" : down ? "down" : undefined}
        />
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-fg/50">Why this model</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg/80 text-pretty">{value.why}</p>
      <p className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-fg/45">
        {value.formula}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {value.inputs.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg/45">{row.label}</dt>
            <dd className="mt-1 truncate text-sm tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-fg/40">{value.asOf}</p>
    </section>
  );
}

export function ModelFormulas() {
  return (
    <section className="glass-panel overflow-hidden p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-fg/50">Models</p>
      <h2 className="mt-1 text-lg font-semibold">How value is built</h2>
      <dl className="mt-5 space-y-4">
        {MODEL_ORDER.map((kind) => (
          <div key={kind}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-fg/50">{MODEL_LABEL[kind]}</dt>
            <dd className="mt-1 overflow-x-auto font-mono text-xs leading-relaxed text-fg/70">{MODEL_FORMULA[kind]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Metric({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-fg/45">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums leading-tight",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {value}
        {unit ? <span className="ml-1 text-xs font-medium text-fg/55"> {unit}</span> : null}
      </p>
      {hint ? <p className="mt-0.5 text-xs tabular-nums text-fg/45">{hint}</p> : null}
    </div>
  );
}
