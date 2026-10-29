import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { capitalizeFirst } from "../lib/format-label.ts";

describe("capitalizeFirst", () => {
  it("upper-cases the first letter only", () => {
    assert.equal(capitalizeFirst("gap left of extensions icon"), "Gap left of extensions icon");
    assert.equal(capitalizeFirst("Lily card"), "Lily card");
    assert.equal(capitalizeFirst("a"), "A");
  });

  it("leaves camel-case names and non-letters alone", () => {
    assert.equal(capitalizeFirst("iPhone icon"), "iPhone icon");
    assert.equal(capitalizeFirst("eBay logo"), "eBay logo");
    assert.equal(capitalizeFirst("3rd button"), "3rd button");
    assert.equal(capitalizeFirst("새로고침 버튼"), "새로고침 버튼");
    assert.equal(capitalizeFirst(""), "");
  });
});
