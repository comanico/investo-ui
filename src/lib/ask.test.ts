import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CAPABILITY_REPLY, capabilityReply, findDeskTicker, matchDeskName, suggestDeskNames } from "./ask.ts";
import { mostUndervalued } from "./valuation.ts";

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

describe("capabilityReply", () => {
  it("answers what it can do, what this does, and what Investo is", () => {
    for (const q of ["What can you do?", "what does this do", "what is investo", "what's Investo"]) {
      assert.equal(capabilityReply(q), CAPABILITY_REPLY);
    }
  });

  it("leaves a company question to the model", () => {
    assert.equal(capabilityReply("how is TLV valued?"), null);
  });

  it("lists three features and does not call the strategy live", () => {
    const lines = CAPABILITY_REPLY.split("\n").filter((line) => line.trim().length > 0);
    assert.equal(lines.length, 4);
    assert.equal(lines[0], "What I can do:");
    assert.equal(lines[3], "Test a strategy before you trade. Filters on the book are coming in.");
    assert.equal(/live/i.test(CAPABILITY_REPLY), false);
  });
});

describe("mostUndervalued", () => {
  const desk = [
    { ticker: "TLV" },
    { ticker: "SNP" },
    { ticker: "BRD" },
    { ticker: "H2O" },
  ];
  const valuations = {
    TLV: { upsidePct: -37.6 },
    SNP: { upsidePct: 18.2 },
    BRD: { upsidePct: 41 },
    H2O: { upsidePct: 9.1 },
  };

  it("ranks the widest gap above the close first", () => {
    const picks = mostUndervalued(desk, valuations as never, 3);
    assert.deepEqual(
      picks.map((row) => row.ticker),
      ["BRD", "SNP", "H2O"],
    );
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
