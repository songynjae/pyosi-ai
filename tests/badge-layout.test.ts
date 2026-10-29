import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { separateBadges } from "../lib/badge-layout.ts";

const D = 24;

describe("separateBadges", () => {
  it("does not move badges that do not touch", () => {
    const out = separateBadges(
      [
        { id: "a", x: 100, y: 100 },
        { id: "b", x: 140, y: 100 },
      ],
      D,
      400,
    );
    assert.deepEqual(out, { a: 0, b: 0 });
  });

  it("moves the later of two overlapping badges up by one badge", () => {
    const out = separateBadges(
      [
        { id: "a", x: 100, y: 100 },
        { id: "b", x: 110, y: 100 },
      ],
      D,
      400,
    );
    assert.equal(out.a, 0);
    assert.equal(out.b, -(D + 2));
  });

  it("stacks three badges that sit on top of each other", () => {
    const out = separateBadges(
      [
        { id: "a", x: 100, y: 200 },
        { id: "b", x: 100, y: 200 },
        { id: "c", x: 100, y: 200 },
      ],
      D,
      400,
    );
    assert.equal(out.a, 0);
    assert.equal(out.b, -26);
    assert.equal(out.c, 26);
  });

  it("goes down when there is no room above, and stays inside the image", () => {
    const out = separateBadges(
      [
        { id: "a", x: 100, y: 14 },
        { id: "b", x: 100, y: 14 },
      ],
      D,
      400,
    );
    assert.equal(out.b, 26);
    for (const [id, y] of [["a", 14], ["b", 14]] as const) {
      const final = y + out[id];
      assert.ok(final >= 12 && final <= 388);
    }
  });

  it("is deterministic: the earlier entry keeps its place", () => {
    const pts = [
      { id: "a", x: 50, y: 60 },
      { id: "b", x: 55, y: 60 },
    ];
    assert.deepEqual(separateBadges(pts, D, 300), separateBadges(pts, D, 300));
    assert.equal(separateBadges(pts, D, 300).a, 0);
  });
});
