import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findDeskTicker, matchDeskName, suggestDeskNames } from "./ask.ts";

const names = [
  { ticker: "TLV", name: "Banca Transilvania S.A." },
  { ticker: "SNP", name: "OMV Petrom S.A." },
  { ticker: "BRD", name: "BRD - Groupe Societe Generale S.A." },
];

describe("matchDeskName", () => {
  it("routes an exact ticker", () => {
    assert.equal(matchDeskName("tlv", names), "TLV");
  });

  it("routes a unique company name of at least 3 characters", () => {
    assert.equal(matchDeskName("Banca Transilvania", names), "TLV");
  });

  it("does not treat a short fragment as a name match", () => {
    assert.equal(matchDeskName("om", names), null);
  });
});

describe("suggestDeskNames", () => {
  it("lists ticker prefixes first", () => {
    const hits = suggestDeskNames("tl", names);
    assert.equal(hits[0]?.ticker, "TLV");
  });

  it("matches a company name fragment", () => {
    const hits = suggestDeskNames("petrom", names);
    assert.equal(hits[0]?.ticker, "SNP");
  });

  it("is empty when nothing is typed", () => {
    assert.equal(suggestDeskNames("  ", names).length, 0);
  });
});

describe("findDeskTicker", () => {
  it("finds an exact ticker inside a question", () => {
    assert.equal(findDeskTicker("how is TLV valued?", names), "TLV");
  });

  it("finds a company name of at least 3 characters", () => {
    assert.equal(findDeskTicker("how is Banca Transilvania valued?", names), "TLV");
  });
});
