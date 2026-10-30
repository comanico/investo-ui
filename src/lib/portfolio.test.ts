import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupHoldings, linePnl, type Holding } from "./portfolio.ts";

const lots: Holding[] = [
  { id: "1", ticker: "TLV", qty: 10, avgCost: 20, boughtOn: "2024-01-02" },
  { id: "2", ticker: "TLV", qty: 10, avgCost: 40, boughtOn: "2024-06-01" },
  { id: "3", ticker: "SNP", qty: 100, avgCost: 0.5, boughtOn: "2025-01-01" },
];

describe("groupHoldings", () => {
  it("weights average cost across lots of the same ticker", () => {
    const [snp, tlv] = groupHoldings(lots);
    assert.equal(tlv?.ticker, "TLV");
    assert.equal(tlv?.qty, 20);
    assert.equal(tlv?.avgCost, 30);
    assert.equal(snp?.ticker, "SNP");
  });
});

describe("linePnl", () => {
  it("reports a gain versus cost", () => {
    const stats = linePnl(10, 20, 30);
    assert.equal(stats.value, 300);
    assert.equal(stats.pnl, 100);
    assert.equal(stats.pnlPct, 50);
  });
});
