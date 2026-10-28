import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxSchema } from "../lib/annotation-schema.ts";
import {
  applyDrag,
  MIN_BOX_PERCENT,
  removeAnnotation,
  setAnnotationBox,
  setAnnotationText,
  type DragMode,
} from "../lib/box-edit.ts";
import type { Annotation } from "../lib/types.ts";

const box = { x: 20, y: 30, width: 40, height: 20 };

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);
}

describe("applyDrag: move", () => {
  it("shifts the box and keeps its size", () => {
    const next = applyDrag(box, "move", 5, -10);
    assert.deepEqual(next, { x: 25, y: 20, width: 40, height: 20 });
  });

  it("stops at every edge of the image", () => {
    assert.deepEqual(applyDrag(box, "move", -50, -50), { x: 0, y: 0, width: 40, height: 20 });
    assert.deepEqual(applyDrag(box, "move", 90, 90), { x: 60, y: 80, width: 40, height: 20 });
  });
});

describe("applyDrag: resize", () => {
  it("moves only the dragged edges", () => {
    assert.deepEqual(applyDrag(box, "e", 10, 99), { x: 20, y: 30, width: 50, height: 20 });
    assert.deepEqual(applyDrag(box, "w", 10, 99), { x: 30, y: 30, width: 30, height: 20 });
    assert.deepEqual(applyDrag(box, "s", 99, 5), { x: 20, y: 30, width: 40, height: 25 });
    assert.deepEqual(applyDrag(box, "n", 99, 5), { x: 20, y: 35, width: 40, height: 15 });
  });

  it("moves two edges for a corner", () => {
    assert.deepEqual(applyDrag(box, "se", 10, 10), { x: 20, y: 30, width: 50, height: 30 });
    const nw = applyDrag(box, "nw", -10, -10);
    assert.deepEqual(nw, { x: 10, y: 20, width: 50, height: 30 });
  });

  it("clamps to the image", () => {
    assert.deepEqual(applyDrag(box, "se", 500, 500), { x: 20, y: 30, width: 80, height: 70 });
    assert.deepEqual(applyDrag(box, "nw", -500, -500), { x: 0, y: 0, width: 60, height: 50 });
  });

  it("does not flip or shrink below the minimum", () => {
    const e = applyDrag(box, "e", -500, 0);
    assert.equal(e.x, 20);
    near(e.width, MIN_BOX_PERCENT);
    const w = applyDrag(box, "w", 500, 0);
    near(w.x + w.width, 60);
    near(w.width, MIN_BOX_PERCENT);
    const n = applyDrag(box, "n", 0, 500);
    near(n.height, MIN_BOX_PERCENT);
    near(n.y + n.height, 50);
  });

  it("keeps an already tiny box at its own size as the floor", () => {
    const tiny = { x: 52.7, y: 79.4, width: 0.6, height: 5 };
    const next = applyDrag(tiny, "e", -10, 0);
    near(next.width, 0.6);
    assert.equal(next.x, 52.7);
  });

  it("leaves the box unchanged for a zero drag", () => {
    for (const mode of ["move", "n", "s", "e", "w", "ne", "nw", "se", "sw"] as DragMode[]) {
      assert.deepEqual(applyDrag(box, mode, 0, 0), box, mode);
    }
  });

  it("always produces a box that passes validation", () => {
    const modes: DragMode[] = ["move", "n", "s", "e", "w", "ne", "nw", "se", "sw"];
    const starts = [box, { x: 0, y: 0, width: 100, height: 100 }, { x: 99, y: 99, width: 1, height: 1 }];
    for (const start of starts) {
      for (const mode of modes) {
        for (const dx of [-250, -33.3, 0, 0.1, 47.7, 250]) {
          for (const dy of [-250, -12.9, 0, 0.1, 61.3, 250]) {
            const result = BoxSchema.safeParse(applyDrag(start, mode, dx, dy));
            assert.ok(result.success, `${mode} ${dx},${dy} from ${JSON.stringify(start)}`);
          }
        }
      }
    }
  });
});

const annotations: Annotation[] = [
  { id: "ann-1", label: "A", description: "a", status: "found", box },
  { id: "ann-2", label: "B", description: "b", status: "not_found", box: null },
  { id: "ann-3", label: "C", description: "c", status: "found", box: { x: 1, y: 2, width: 3, height: 4 } },
];

describe("annotation list edits", () => {
  it("replaces only the box of the chosen found annotation", () => {
    const next = setAnnotationBox(annotations, "ann-3", { x: 5, y: 5, width: 5, height: 5 });
    assert.deepEqual(next[2].box, { x: 5, y: 5, width: 5, height: 5 });
    assert.equal(next[0], annotations[0]);
    assert.equal(next[1], annotations[1]);
  });

  it("never gives a box to an annotation that has none", () => {
    const next = setAnnotationBox(annotations, "ann-2", box);
    assert.equal(next[1].box, null);
  });

  it("deletes the whole entry and keeps the order of the rest", () => {
    const next = removeAnnotation(annotations, "ann-1");
    assert.deepEqual(next.map((a) => a.id), ["ann-2", "ann-3"]);
    assert.equal(annotations.length, 3);
  });

  it("ignores an unknown id", () => {
    assert.equal(removeAnnotation(annotations, "nope").length, 3);
  });

  it("edits the text of one annotation and trims it", () => {
    const next = setAnnotationText(annotations, "ann-2", { label: "  Refresh button ", description: " Not visible. " });
    assert.equal(next[1].label, "Refresh button");
    assert.equal(next[1].description, "Not visible.");
    assert.equal(next[1].status, "not_found");
    assert.equal(next[1].box, null);
    assert.equal(next[0], annotations[0]);
  });

  it("allows an empty description but never an empty label", () => {
    const cleared = setAnnotationText(annotations, "ann-1", { label: "A", description: "  " });
    assert.equal(cleared[0].description, "");
    assert.equal(setAnnotationText(annotations, "ann-1", { label: "   ", description: "x" }), annotations);
  });
});
