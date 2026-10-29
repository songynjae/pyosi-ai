import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxSchema, parseAnnotations } from "../lib/annotation-schema.ts";
import { parseModelOutput } from "../lib/model-output.ts";
import { gapBetween, markerBetween, MIN_MARKER_PERCENT, parseGroups, resolveMeasure } from "../lib/spacing.ts";
import { badgePlacement } from "../lib/badge-placement.ts";

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);
}

describe("gapBetween", () => {
  const left = { x: 10, y: 20, width: 10, height: 20 };
  const right = { x: 40, y: 25, width: 10, height: 30 };

  it("measures the horizontal gap along the shared vertical range", () => {
    const gap = gapBetween(left, right);
    assert.equal(gap?.axis, "horizontal");
    const box = gap!.box;
    near(box.x, 20);
    near(box.width, 20);
    near(box.y, 25);
    near(box.height, 15);
    assert.ok(BoxSchema.safeParse(box).success);
  });

  it("does not depend on the order of the two elements", () => {
    assert.deepEqual(gapBetween(right, left), gapBetween(left, right));
  });

  it("measures a vertical gap", () => {
    const top = { x: 10, y: 10, width: 30, height: 10 };
    const bottom = { x: 20, y: 50, width: 30, height: 10 };
    const gap = gapBetween(top, bottom);
    assert.equal(gap?.axis, "vertical");
    near(gap!.box.y, 20);
    near(gap!.box.height, 30);
    near(gap!.box.x, 20);
    near(gap!.box.width, 20);
  });

  it("has no gap for overlapping, touching or diagonal elements", () => {
    assert.equal(gapBetween(left, { x: 15, y: 25, width: 10, height: 10 }), null);
    assert.equal(gapBetween(left, { x: 20, y: 20, width: 10, height: 20 }), null);
    assert.equal(gapBetween(left, { x: 40, y: 60, width: 10, height: 10 }), null);
  });
});

describe("markerBetween", () => {
  const left = { x: 10, y: 20, width: 10, height: 20 };

  it("uses the exact gap when there is one", () => {
    const m = markerBetween(left, { x: 40, y: 25, width: 10, height: 30 });
    assert.equal(m.axis, "horizontal");
    near(m.box.x, 20);
    near(m.box.width, 20);
  });

  it("still marks the space when the model's boxes overlap, centered between the facing edges", () => {
    // left ends at 20, the other starts at 18: overlapping by 2.
    const m = markerBetween(left, { x: 18, y: 22, width: 10, height: 20 }, "horizontal");
    assert.equal(m.axis, "horizontal");
    near(m.box.width, MIN_MARKER_PERCENT);
    near(m.box.x + m.box.width / 2, 19);
    near(m.box.y, 22);
    near(m.box.height, 18);
    assert.ok(BoxSchema.safeParse(m.box).success);
  });

  it("marks touching elements and does not depend on their order", () => {
    const right = { x: 20, y: 20, width: 10, height: 20 };
    const m = markerBetween(left, right, "horizontal");
    near(m.box.x + m.box.width / 2, 20);
    assert.deepEqual(markerBetween(right, left, "horizontal"), m);
  });

  it("handles diagonal neighbours by spanning the shorter element around the middle", () => {
    const m = markerBetween(left, { x: 40, y: 60, width: 10, height: 10 }, "horizontal");
    assert.equal(m.axis, "horizontal");
    near(m.box.height, 10);
    near(m.box.y + m.box.height / 2, (30 + 65) / 2);
    assert.ok(BoxSchema.safeParse(m.box).success);
  });

  it("works vertically and picks an axis from the boxes when the hint is missing", () => {
    const top = { x: 10, y: 10, width: 30, height: 20 };
    const bottom = { x: 12, y: 29, width: 30, height: 20 };
    const m = markerBetween(top, bottom);
    assert.equal(m.axis, "vertical");
    near(m.box.height, MIN_MARKER_PERCENT);
    near(m.box.y + m.box.height / 2, 29.5);
    assert.ok(BoxSchema.safeParse(m.box).success);
  });

  it("stays inside the image at the edges", () => {
    const m = markerBetween({ x: 0, y: 0, width: 1, height: 10 }, { x: 0.5, y: 0, width: 5, height: 10 }, "horizontal");
    assert.ok(BoxSchema.safeParse(m.box).success);
    assert.ok(m.box.x >= 0 && m.box.x + m.box.width <= 100);
  });
});

describe("resolveMeasure", () => {
  // Grid boxes [x_min, y_min, x_max, y_max] on 0-1000.
  const raw = [
    {
      id: "toolbar",
      axis: "horizontal",
      items: [
        { label: "Star", box_2d: [100, 200, 200, 400] },
        { label: "Puzzle", box_2d: [400, 250, 500, 550] },
        { label: "Avatar", box_2d: [450, 250, 520, 550] }, // overlaps the puzzle
        { label: "Broken", box_2d: [1, 2, 3] },
      ],
    },
  ];
  const groups = parseGroups(raw);

  it("drops items without a usable box and groups without an id", () => {
    assert.equal(groups[0].items.length, 3);
    assert.deepEqual(parseGroups([{ axis: "horizontal", items: [] }, null, "x"]), []);
    assert.deepEqual(parseGroups(null), []);
  });

  it("computes the gap between the two named items, found by label", () => {
    const m = resolveMeasure({ group: "toolbar", between: ["star", " PUZZLE "] }, groups);
    assert.equal(m?.axis, "horizontal");
    near(m!.box.x, 20);
    near(m!.box.width, 20);
  });

  it("still gives a marker for items whose boxes overlap", () => {
    const m = resolveMeasure({ group: "toolbar", between: ["Puzzle", "Avatar"] }, groups);
    assert.equal(m?.axis, "horizontal");
    near(m!.box.width, MIN_MARKER_PERCENT);
  });

  it("measures one item along the given axis", () => {
    const m = resolveMeasure({ group: "toolbar", of: "Star", axis: "vertical" }, groups);
    assert.equal(m?.axis, "vertical");
    near(m!.box.height, 20);
    assert.equal(resolveMeasure({ group: "toolbar", of: "Star", axis: null }, groups), null);
  });

  it("returns null instead of guessing when the entry points at nothing usable", () => {
    assert.equal(resolveMeasure({ group: "nope", between: ["Star", "Puzzle"] }, groups), null);
    assert.equal(resolveMeasure({ group: "toolbar", between: ["Star", "Ghost"] }, groups), null);
    assert.equal(resolveMeasure({ group: "toolbar", between: ["Star", "Star"] }, groups), null);
    assert.equal(resolveMeasure({ group: "toolbar", between: ["Broken", "Star"] }, groups), null);
    assert.equal(resolveMeasure({ group: "toolbar" }, groups), null);
    assert.equal(resolveMeasure({ between: ["Star", "Puzzle"] }, groups), null);
  });
});

describe("parseModelOutput with measure entries", () => {
  const reply = (annotations: unknown[], groups: unknown = []) => JSON.stringify({ annotations, groups });
  const base = { label: "Gap", description: "d", status: "found", box_2d: null, kind: "measure", axis: null, value: null, of: null };
  const toolbar = {
    id: "g1",
    axis: "horizontal",
    items: [
      { label: "Star", box_2d: [100, 200, 200, 400] },
      { label: "Puzzle", box_2d: [400, 250, 500, 550] },
      { label: "Download", box_2d: [700, 250, 800, 550] },
    ],
  };

  it("turns each measurement entry into a distance annotation with its value", () => {
    const res = parseModelOutput(
      reply(
        [
          { ...base, group: "g1", between: ["Star", "Puzzle"], value: " 8mm? " },
          { ...base, label: "Gap 2", group: "g1", between: ["Puzzle", "Download"] },
        ],
        [toolbar],
      ),
    );
    assert.ok(res.ok);
    if (res.ok) {
      assert.equal(res.invalid.length, 0);
      assert.equal(res.annotations.length, 2);
      const [a, b] = res.annotations;
      assert.equal(a.kind, "measure");
      assert.equal(a.axis, "horizontal");
      assert.equal(a.value, "8mm?");
      near(a.box!.x, 20);
      near(a.box!.width, 20);
      assert.equal(b.value, undefined);
      near(b.box!.x, 50);
      near(b.box!.width, 20);
    }
  });

  it("leaves plain entries unchanged", () => {
    const res = parseModelOutput(
      reply([{ label: "Card", description: "d", status: "found", kind: "box", axis: null, value: null, group: null, between: null, of: null, box_2d: [100, 100, 300, 200] }]),
    );
    assert.ok(res.ok);
    if (res.ok) {
      assert.equal(res.annotations[0].kind, undefined);
      assert.equal(res.annotations[0].axis, undefined);
    }
  });

  it("works without any groups for plain boxes (old responses)", () => {
    const res = parseModelOutput(JSON.stringify({ annotations: [{ label: "A", description: "d", status: "found", box_2d: [100, 100, 300, 200] }] }));
    assert.ok(res.ok);
    if (res.ok) assert.equal(res.annotations.length, 1);
  });

  it("still draws a marker when the two items overlap", () => {
    const res = parseModelOutput(
      reply(
        [{ ...base, group: "g1", between: ["Star", "Overlap"] }],
        [{ ...toolbar, items: [...toolbar.items, { label: "Overlap", box_2d: [150, 250, 300, 450] }] }],
      ),
    );
    assert.ok(res.ok);
    if (res.ok) {
      assert.equal(res.invalid.length, 0);
      assert.equal(res.annotations[0].kind, "measure");
      near(res.annotations[0].box!.width, MIN_MARKER_PERCENT);
    }
  });

  it("reports a measurement that points at nothing usable instead of repairing it, saying why", () => {
    const res = parseModelOutput(
      reply(
        [
          { ...base, group: "g1", between: ["Star", "Ghost"] },
          { ...base, group: "other", between: ["Star", "Puzzle"] },
          { ...base, group: null, between: ["Star", "Puzzle"] },
          { ...base, group: "g1", between: null, of: null },
        ],
        [toolbar],
      ),
    );
    assert.ok(res.ok);
    if (res.ok) {
      assert.equal(res.annotations.length, 0);
      assert.equal(res.invalid.length, 4);
      assert.match(res.invalid[0].issues[0], /"Ghost" not found in group "g1" \(items: "Star", "Puzzle", "Download"\)/);
      assert.match(res.invalid[1].issues[0], /group "other", which was not returned \(groups: "g1"\)/);
      assert.match(res.invalid[2].issues[0], /has no group/);
      assert.match(res.invalid[3].issues[0], /names no items/);
      assert.deepEqual(res.invalid.map((i) => i.index), [0, 1, 2, 3]);
    }
  });
});

describe("validation of distance annotations", () => {
  const box = { x: 10, y: 10, width: 20, height: 5 };
  const ok = { id: "a", label: "Gap", description: "d", status: "found", box };

  it("accepts a measure with an axis and an optional value", () => {
    const r = parseAnnotations([{ ...ok, kind: "measure", axis: "vertical", value: "8px" }, { ...ok, id: "b", kind: "measure", axis: "horizontal" }]);
    assert.equal(r.annotations.length, 2);
    assert.equal(r.invalid.length, 0);
  });

  it("requires an axis and a found status for a measure", () => {
    const r = parseAnnotations([
      { ...ok, kind: "measure" },
      { ...ok, id: "b", kind: "measure", axis: "horizontal", status: "not_found", box: null },
    ]);
    assert.equal(r.annotations.length, 0);
    assert.equal(r.invalid.length, 2);
  });

  it("does not allow axis or value on a plain box", () => {
    const r = parseAnnotations([{ ...ok, axis: "horizontal" }, { ...ok, id: "b", kind: "box", value: "8mm" }]);
    assert.equal(r.annotations.length, 0);
    assert.equal(r.invalid.length, 2);
  });
});

describe("badge placement for a vertical distance line", () => {
  it("goes beside the line so it does not cover the item above", () => {
    assert.equal(badgePlacement({ x: 10, y: 40, width: 4, height: 20 }, "measure", "vertical"), "right");
    assert.equal(badgePlacement({ x: 10, y: 1, width: 4, height: 20 }, "measure", "vertical"), "right");
    assert.equal(badgePlacement({ x: 10, y: 40, width: 20, height: 4 }, "measure", "horizontal"), "above");
  });
});

describe("badge placement for a distance line", () => {
  it("is never on the corner, even for a large box", () => {
    assert.equal(badgePlacement({ x: 10, y: 40, width: 50, height: 30 }, "measure"), "above");
    assert.equal(badgePlacement({ x: 10, y: 2, width: 50, height: 30 }, "measure"), "below");
    assert.equal(badgePlacement({ x: 10, y: 40, width: 50, height: 30 }), "corner");
  });
});

describe("between as a list (prompt v12)", () => {
  const entry = (extra: Record<string, unknown>) => ({
    label: "Gap", description: "d", status: "found", box_2d: null, kind: "measure", axis: null, value: null, group: "g1", ...extra,
  });
  const groups = [{ id: "g1", axis: "horizontal", items: [{ label: "A", box_2d: [100, 200, 200, 400] }, { label: "B", box_2d: [400, 250, 500, 550] }] }];

  it("an empty list on a distance entry is reported with the reason, never repaired", () => {
    const res = parseModelOutput(JSON.stringify({ annotations: [entry({ between: [] })], groups }));
    assert.ok(res.ok);
    if (res.ok) {
      assert.equal(res.annotations.length, 0);
      assert.match(res.invalid[0].issues[0], /needs exactly two item names, got 0/);
    }
  });

  it("an empty list on a plain box entry is fine and the distance entry next to it still resolves", () => {
    const box = { label: "Card", description: "d", status: "found", kind: "box", axis: null, value: null, group: null, between: [], box_2d: [100, 100, 300, 200] };
    const res = parseModelOutput(JSON.stringify({ annotations: [box, entry({ between: ["A", "B"] })], groups }));
    assert.ok(res.ok);
    if (res.ok) {
      assert.equal(res.invalid.length, 0);
      assert.deepEqual(res.annotations.map((a) => a.kind ?? "box"), ["box", "measure"]);
    }
  });
});
