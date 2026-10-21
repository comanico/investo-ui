import type { NewsHit } from "./news";
import type { EquityQuote } from "./types";
import { formatRon } from "./market";
import { formatSignedPct, STANCE_LABEL, type ValuationResult } from "./valuation";

export type BriefSource = {
  label: string;
  detail: string;
};

export type CompanyBrief = {
  profile: string;
  valuation: string;
  market: string;
  sources: BriefSource[];
};

function input(value: ValuationResult, label: string): string | undefined {
  return value.inputs.find((row) => row.label === label)?.value;
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function briefCompany(
  quote: EquityQuote,
  blurb: string | undefined,
  valuation: ValuationResult | null,
  news: NewsHit[],
): CompanyBrief {
  const profile = blurb ?? `${quote.name} (${quote.ticker}).`;

  const sources: BriefSource[] = [];
  if (blurb) sources.push({ label: "Profile", detail: "Desk description" });

  let valuationText: string;
  if (!valuation) {
    valuationText = `No model result is attached to ${quote.ticker} yet.`;
  } else {
    const re = input(valuation, "rₑ (CAPM)");
    const stance = STANCE_LABEL[valuation.stance].toLowerCase();
    const gap =
      valuation.upsidePct >= 0
        ? `${formatSignedPct(valuation.upsidePct)} above`
        : `${formatSignedPct(valuation.upsidePct)} versus`;
    valuationText = `${valuation.why} Cost of equity is ${re ?? "the CAPM rate"}. ${valuation.modelLabel} puts intrinsic value at ${formatRon(valuation.intrinsic)} RON, ${gap} the ${formatRon(valuation.last)} RON close used in the model. That is ${stance}.`;
    sources.push({
      label: valuation.modelLabel,
      detail: valuation.asOf,
    });
  }

  const latest = news.slice(0, 3);
  let market: string;
  if (latest.length === 0) {
    market = `No headlines are loaded for ${quote.ticker}.`;
  } else {
    const lines = latest
      .map((item) => `${item.headline} (${item.source}, ${when(item.at)})`)
      .join(" ");
    market = lines;
    for (const item of latest) {
      sources.push({ label: item.source, detail: `${quote.ticker} · ${when(item.at)}` });
    }
  }

  return { profile, valuation: valuationText, market, sources };
}
