import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { badgePlacement } from "../lib/badge-placement.ts";

describe("badgePlacement", () => {
  it("keeps the corner badge for normal-sized boxes", () => {
    // The Floraday card: 46% x 49%.
    assert.equal(badgePlacement({ x: 27, y: 18, width: 46, height: 49 }), "corner");
    assert.equal(badgePlacement({ x: 10, y: 40, width: 10, height: 10 }), "corner");
  });

  it("puts the badge above a small box", () => {
    // The Google "Create images" icon: about 1.7% wide, 5% high.
    assert.equal(badgePlacement({ x: 52.7, y: 79.4, width: 1.7, height: 5 }), "above");
    assert.equal(badgePlacement({ x: 10, y: 40, width: 30, height: 3 }), "above");
    // The Cursor voice icon: about 6.2% x 8.3% (model box 6.6% x 7.3%).
    assert.equal(badgePlacement({ x: 85.3, y: 45.3, width: 6.2, height: 8.3 }), "above");
    assert.equal(badgePlacement({ x: 85.1, y: 46.4, width: 6.6, height: 7.3 }), "above");
    // A 14% x 6.4% button is also small by height.
    assert.equal(badgePlacement({ x: 43, y: 90, width: 14, height: 6.4 }), "above");
  });

  it("puts the badge below a small box near the top edge", () => {
    assert.equal(badgePlacement({ x: 10, y: 2, width: 2, height: 2 }), "below");
  });
});
