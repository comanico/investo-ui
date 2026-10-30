import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAllowedUser } from "./access.ts";

describe("isAllowedUser", () => {
  it("allows the two listed user ids", () => {
    assert.equal(isAllowedUser("5883260f-3c5f-4136-afb8-269bb1a9f621"), true);
    assert.equal(isAllowedUser("419809cf-ec16-443e-a6fc-cd6d9c913bf9"), true);
  });

  it("blocks everyone else", () => {
    assert.equal(isAllowedUser("00000000-0000-0000-0000-000000000000"), false);
    assert.equal(isAllowedUser(null), false);
  });
});
