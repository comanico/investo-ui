export type DailyClose = {
  date: string;
  close: number;
};

export function bucharestToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
}

/** Last session close on or before `date` (YYYY-MM-DD). */
export function closeOnOrBefore(prices: DailyClose[], date: string): DailyClose | null {
  let hit: DailyClose | null = null;
  for (const row of prices) {
    if (row.date > date) break;
    hit = row;
  }
  return hit;
}

export function asDailyCloses(rows: { date?: string; close?: number }[] | undefined): DailyClose[] {
  const out: DailyClose[] = [];
  for (const row of rows ?? []) {
    const close = Number(row.close);
    if (!row.date || !Number.isFinite(close) || close <= 0) continue;
    out.push({ date: row.date, close });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}
