import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AnnotationSchema, parseAnnotations } from "../lib/annotation-schema.ts";

const found = (over: Record<string, unknown> = {}) => ({
  id: "a",
  label: "Button",
  description: "A button",
  status: "found",
  box: { x: 10, y: 20, width: 30, height: 40 },
  ...over,
});

const missing = (status: string, over: Record<string, unknown> = {}) => ({
  id: "m",
  label: "Missing",
  description: "Not visible",
  status,
  box: null,
  ...over,
});

describe("box validation", () => {
  it("accepts a valid box and one that touches the edges", () => {
    assert.ok(AnnotationSchema.safeParse(found()).success);
    assert.ok(
      AnnotationSchema.safeParse(
        found({ box: { x: 0, y: 0, width: 100, height: 100 } }),
      ).success,
    );
    // floating-point sum that is 100 within tolerance
    assert.ok(
      AnnotationSchema.safeParse(
        found({ box: { x: 0.1 + 0.2, y: 0, width: 99.7, height: 10 } }),
      ).success,
    );
  });

  const invalidBoxes: Record<string, unknown> = {
    "negative x": { x: -1, y: 0, width: 10, height: 10 },
    "negative y": { x: 0, y: -0.5, width: 10, height: 10 },
    "zero width": { x: 0, y: 0, width: 0, height: 10 },
    "negative height": { x: 0, y: 0, width: 10, height: -5 },
    "x + width over 100": { x: 60, y: 0, width: 41, height: 10 },
    "y + height over 100": { x: 0, y: 95, width: 10, height: 6 },
    "x over 100": { x: 101, y: 0, width: 1, height: 1 },
    NaN: { x: Number.NaN, y: 0, width: 10, height: 10 },
    Infinity: { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 10 },
    "string value": { x: "10", y: 0, width: 10, height: 10 },
    "missing field": { x: 0, y: 0, width: 10 },
  };

  for (const [name, box] of Object.entries(invalidBoxes)) {
    it(`rejects ${name}`, () => {
      assert.equal(AnnotationSchema.safeParse(found({ box })).success, false);
    });
  }

  it("never clamps: an out-of-range box is reported, not repaired", () => {
    const { annotations, invalid } = parseAnnotations([
      found({ box: { x: 60, y: 0, width: 50, height: 10 } }),
    ]);
    assert.equal(annotations.length, 0);
    assert.equal(invalid.length, 1);
    assert.match(invalid[0].issues.join(" "), /x \+ width must be <= 100/);
  });
});

describe("status and box consistency", () => {
  it("requires a box when status is found", () => {
    const r = AnnotationSchema.safeParse(found({ box: null }));
    assert.equal(r.success, false);
  });

  it("accepts ambiguous and not_found with a null box", () => {
    assert.ok(AnnotationSchema.safeParse(missing("ambiguous")).success);
    assert.ok(AnnotationSchema.safeParse(missing("not_found")).success);
  });

  it("rejects a box on ambiguous or not_found", () => {
    const box = { x: 1, y: 1, width: 5, height: 5 };
    assert.equal(
      AnnotationSchema.safeParse(missing("ambiguous", { box })).success,
      false,
    );
    assert.equal(
      AnnotationSchema.safeParse(missing("not_found", { box })).success,
      false,
    );
  });

  it("rejects an unknown status and a missing box key", () => {
    assert.equal(
      AnnotationSchema.safeParse(found({ status: "maybe" })).success,
      false,
    );
    const noBox: Record<string, unknown> = found();
    delete noBox.box;
    assert.equal(AnnotationSchema.safeParse(noBox).success, false);
  });
});

describe("parseAnnotations", () => {
  it("keeps missing-location annotations as valid, in order", () => {
    const { annotations, invalid } = parseAnnotations([
      found({ id: "a" }),
      missing("not_found", { id: "b" }),
      missing("ambiguous", { id: "c" }),
    ]);
    assert.deepEqual(
      annotations.map((a) => [a.id, a.status, a.box === null]),
      [
        ["a", "found", false],
        ["b", "not_found", true],
        ["c", "ambiguous", true],
      ],
    );
    assert.equal(invalid.length, 0);
  });

  it("partial success: valid entries survive an invalid neighbour", () => {
    const { annotations, invalid } = parseAnnotations([
      found({ id: "first" }),
      found({ id: "bad", box: { x: 90, y: 0, width: 20, height: 10 } }),
      found({ id: "last" }),
    ]);
    assert.deepEqual(
      annotations.map((a) => a.id),
      ["first", "last"],
    );
    assert.equal(invalid.length, 1);
    assert.equal(invalid[0].index, 1);
    assert.equal(invalid[0].id, "bad");
  });

  it("does not report an invalid entry as not_found", () => {
    const { annotations, invalid } = parseAnnotations([
      found({ id: "bad", box: { x: -5, y: 0, width: 10, height: 10 } }),
    ]);
    assert.equal(annotations.some((a) => a.status === "not_found"), false);
    assert.equal(invalid.length, 1);
  });

  it("reports non-object entries and keeps going", () => {
    const { annotations, invalid } = parseAnnotations([
      null,
      "text",
      found({ id: "ok" }),
    ]);
    assert.deepEqual(
      invalid.map((i) => [i.index, i.id]),
      [
        [0, null],
        [1, null],
      ],
    );
    assert.equal(annotations.length, 1);
  });

  it("rejects duplicate ids after the first", () => {
    const { annotations, invalid } = parseAnnotations([
      found({ id: "x" }),
      found({ id: "x" }),
    ]);
    assert.equal(annotations.length, 1);
    assert.equal(invalid[0].index, 1);
    assert.match(invalid[0].issues[0], /duplicate id/);
  });

  it("reports a non-array input as a single invalid entry", () => {
    const { annotations, invalid } = parseAnnotations({ not: "an array" });
    assert.equal(annotations.length, 0);
    assert.equal(invalid.length, 1);
    assert.equal(invalid[0].index, null);
  });

  it("accepts an empty array", () => {
    assert.deepEqual(parseAnnotations([]), { annotations: [], invalid: [] });
  });
});
