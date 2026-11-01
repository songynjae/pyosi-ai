import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  badgeCenter,
  entryText,
  exportFileName,
  exportMetrics,
  layoutList,
  measureMarks,
  pixelBox,
  valueLabelCenter,
  wrapText,
} from "../lib/export-image.ts";
import type { Annotation } from "../lib/types.ts";

// 10 px per character, so widths are easy to reason about.
const measure = (s: string) => s.length * 10;

const found: Annotation = {
  id: "a",
  label: "Card",
  description: "Too large.",
  status: "found",
  box: { x: 10, y: 20, width: 30, height: 40 },
};
const missing: Annotation = {
  id: "b",
  label: "Refresh",
  description: "Missing.",
  status: "not_found",
  box: null,
};

describe("exportMetrics", () => {
  it("keeps the on-screen sizes up to 700 px wide and scales above", () => {
    assert.equal(exportMetrics(400).scale, 1);
    assert.equal(exportMetrics(700).badge, 24);
    const big = exportMetrics(2100);
    assert.equal(big.scale, 3);
    assert.equal(big.badge, 72);
    assert.equal(big.stroke, 6);
  });
});

describe("pixelBox", () => {
  it("converts percent to pixels of the original size", () => {
    assert.deepEqual(pixelBox({ x: 10, y: 20, width: 30, height: 40 }, { width: 2000, height: 1000 }), {
      x: 200,
      y: 200,
      width: 600,
      height: 400,
    });
  });
});

describe("badgeCenter", () => {
  const m = exportMetrics(700);
  const size = { width: 700, height: 500 };
  const box = { x: 100, y: 200, width: 200, height: 100 };

  it("sits on the top-left corner for normal boxes", () => {
    assert.deepEqual(badgeCenter(box, "corner", m, size), { x: 100, y: 200 });
  });

  it("sits beside the middle of a vertical line for the right placement", () => {
    assert.deepEqual(badgeCenter({ x: 100, y: 200, width: 40, height: 60 }, "right", m, size), { x: 140, y: 230 });
  });

  it("is centered above or below a small box", () => {
    assert.deepEqual(badgeCenter(box, "above", m, size), { x: 200, y: 180 });
    assert.deepEqual(badgeCenter(box, "below", m, size), { x: 200, y: 320 });
  });

  it("stays inside the image", () => {
    const edge = badgeCenter({ x: 0, y: 0, width: 50, height: 50 }, "corner", m, size);
    assert.deepEqual(edge, { x: 12, y: 12 });
    const far = badgeCenter({ x: 700, y: 500, width: 0, height: 0 }, "corner", m, size);
    assert.deepEqual(far, { x: 688, y: 488 });
  });
});

describe("entryText", () => {
  it("joins label and description", () => {
    assert.equal(entryText(found), "Card: Too large.");
    assert.equal(entryText({ ...found, description: "" }), "Card");
  });

  it("capitalizes the first letter of the label", () => {
    assert.equal(entryText({ ...found, label: "gap before button" }), "Gap before button: Too large.");
  });

  it("says when there is no location", () => {
    assert.equal(entryText(missing), "Refresh: Missing. (location not found)");
    assert.equal(
      entryText({ ...missing, status: "ambiguous" }),
      "Refresh: Missing. (location ambiguous)",
    );
  });
});

describe("wrapText", () => {
  it("keeps short text on one line", () => {
    assert.deepEqual(wrapText("one two", 100, measure), ["one two"]);
  });

  it("wraps on words", () => {
    // 10 chars per line.
    assert.deepEqual(wrapText("aaaa bbbb cccc", 100, measure), ["aaaa bbbb", "cccc"]);
  });

  it("splits a word that is wider than the line", () => {
    assert.deepEqual(wrapText("abcdefghijklmno", 50, measure), ["abcde", "fghij", "klmno"]);
  });

  it("splits long text without spaces (e.g. CJK) and always terminates", () => {
    const lines = wrapText("가나다라마바사아자차", 30, measure);
    assert.deepEqual(lines, ["가나다", "라마바", "사아자", "차"]);
    // A width smaller than one character still makes progress.
    assert.equal(wrapText("abc", 1, measure).join(""), "abc");
  });

  it("returns one empty line for empty text", () => {
    assert.deepEqual(wrapText("   ", 100, measure), [""]);
  });
});

describe("layoutList", () => {
  const m = exportMetrics(700);

  it("is empty without annotations", () => {
    assert.deepEqual(layoutList([], 700, m, measure), { height: 0, rows: [] });
  });

  it("numbers rows by list position and marks entries without a box", () => {
    const { rows } = layoutList([found, missing, found], 700, m, measure);
    assert.deepEqual(rows.map((r) => r.number), [1, 2, 3]);
    assert.deepEqual(rows.map((r) => r.found), [true, false, true]);
  });

  it("stacks rows and sizes the area from their wrapped lines", () => {
    const narrow = 16 * 2 + 30 + 100; // text width 100 => 10 chars per line
    const { rows, height } = layoutList([{ ...found, description: "aaaa bbbb cccc dddd" }], narrow, m, measure);
    assert.equal(rows.length, 1);
    assert.ok(rows[0].lines.length > 1);
    assert.equal(rows[0].y, m.pad);
    assert.equal(height, m.pad + rows[0].lines.length * m.lineHeight + m.pad);
  });

  it("grows with the number of rows", () => {
    const one = layoutList([found], 700, m, measure).height;
    const two = layoutList([found, found], 700, m, measure).height;
    assert.equal(two - one, m.lineHeight + m.itemGap);
  });
});

describe("exportFileName", () => {
  it("uses the image name, the format and .png", () => {
    assert.equal(exportFileName("shot.jpeg", "annotated"), "shot-annotated.png");
    assert.equal(exportFileName("floraday", "boxes"), "floraday-boxes.png");
  });

  it("removes unsafe characters and falls back to a default", () => {
    assert.equal(exportFileName("my shot: v2?.png", "original"), "my-shot-v2-original.png");
    assert.equal(exportFileName(null, "original"), "pyosi-original.png");
    assert.equal(exportFileName("???.png", "boxes"), "pyosi-boxes.png");
  });
});

describe("measureMarks", () => {
  const m = exportMetrics(700);

  it("draws a horizontal distance through the middle with a cap at each end", () => {
    const marks = measureMarks({ x: 100, y: 50, width: 80, height: 20 }, "horizontal", m);
    assert.deepEqual(marks.line, { x1: 100, y1: 60, x2: 180, y2: 60 });
    assert.deepEqual(marks.caps[0], { x1: 100, y1: 50, x2: 100, y2: 70 });
    assert.deepEqual(marks.caps[1], { x1: 180, y1: 50, x2: 180, y2: 70 });
    assert.deepEqual(marks.center, { x: 140, y: 60 });
  });

  it("limits the caps to 28 px at scale 1 and grows them with the image", () => {
    const tall = { x: 0, y: 0, width: 50, height: 200 };
    const small = measureMarks(tall, "horizontal", m);
    assert.equal(small.caps[0].y2 - small.caps[0].y1, 28);
    const big = measureMarks(tall, "horizontal", exportMetrics(1400));
    assert.equal(big.caps[0].y2 - big.caps[0].y1, 56);
  });

  it("draws a vertical distance the same way", () => {
    const marks = measureMarks({ x: 10, y: 20, width: 12, height: 60 }, "vertical", m);
    assert.deepEqual(marks.line, { x1: 16, y1: 20, x2: 16, y2: 80 });
    assert.deepEqual(marks.caps[0], { x1: 10, y1: 20, x2: 22, y2: 20 });
    assert.deepEqual(marks.caps[1], { x1: 10, y1: 80, x2: 22, y2: 80 });
  });
});

describe("valueLabelCenter", () => {
  const m = exportMetrics(700);

  it("keeps the value on the middle of a horizontal line", () => {
    assert.deepEqual(valueLabelCenter({ x: 140, y: 60 }, "horizontal", 30, m), { x: 140, y: 60 });
  });

  it("puts the value left of a vertical line, clear of the badge on its right", () => {
    const line = { x: 100, y: 200 };
    const width = 30;
    const label = valueLabelCenter(line, "vertical", width, m);
    assert.equal(label.y, 200);
    assert.ok(label.x + width / 2 <= line.x - 6, "the label ends 6 px before the line");
    const badge = badgeCenter({ x: 98, y: 190, width: 4, height: 20 }, "right", m, { width: 700, height: 500 });
    assert.ok(label.x + width / 2 < badge.x - m.badge / 2, "the label ends before the badge starts");
  });
});
