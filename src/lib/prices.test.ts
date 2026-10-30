import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closeOnOrBefore } from "./prices.ts";

const series = [
  { date: "2024-01-02", close: 10 },
  { date: "2024-01-03", close: 11 },
  { date: "2024-01-05", close: 12 },
];

describe("closeOnOrBefore", () => {
  it("returns the close on that session", () => {
    assert.deepEqual(closeOnOrBefore(series, "2024-01-03"), { date: "2024-01-03", close: 11 });
  });

  it("skips a weekend or holiday to the previous session", () => {
    assert.deepEqual(closeOnOrBefore(series, "2024-01-04"), { date: "2024-01-03", close: 11 });
  });

  it("returns null when the date is before the series", () => {
    assert.equal(closeOnOrBefore(series, "2023-12-31"), null);
  });
});
