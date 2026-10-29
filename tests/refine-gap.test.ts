import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refineAnnotations, refineMeasure, type PixelImage } from "../lib/refine-gap.ts";
import type { Annotation, BoxPercent } from "../lib/types.ts";

type Rect = { x: number; y: number; w: number; h: number; color?: [number, number, number] };

function makeImage(width: number, height: number, rects: Rect[], bg: [number, number, number] = [255, 255, 255]): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = bg[0];
    data[i * 4 + 1] = bg[1];
    data[i * 4 + 2] = bg[2];
    data[i * 4 + 3] = 255;
  }
  for (const r of rects) {
    const [cr, cg, cb] = r.color ?? [30, 30, 30];
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const k = (y * width + x) * 4;
        data[k] = cr;
        data[k + 1] = cg;
        data[k + 2] = cb;
      }
    }
  }
  return { width, height, data };
}

const pct = (px: { x: number; y: number; w: number; h: number }, W: number, H: number): BoxPercent => ({
  x: (px.x / W) * 100,
  y: (px.y / H) * 100,
  width: (px.w / W) * 100,
  height: (px.h / H) * 100,
});

function toPx(b: BoxPercent, W: number, H: number) {
  return { x0: (b.x / 100) * W, x1: ((b.x + b.width) / 100) * W, y0: (b.y / 100) * H, y1: ((b.y + b.height) / 100) * H };
}

function near(actual: number, expected: number, tol = 1.01) {
  assert.ok(Math.abs(actual - expected) <= tol, `${actual} not within ${tol} of ${expected}`);
}

describe("refineMeasure (horizontal)", () => {
  // Two 20x30 squares at x 20-39 and x 100-119 (gap = columns 40..99), y 15-44.
  const W = 200;
  const H = 60;
  const icons: Rect[] = [
    { x: 20, y: 15, w: 20, h: 30 },
    { x: 100, y: 15, w: 20, h: 30 },
  ];
  const image = makeImage(W, H, icons);

  it("snaps a marker that is shifted and loose to the real gap and the neighbours' height", () => {
    // Model: x 48-112 (shifted right and too long), y 15-60 (too tall).
    const model = pct({ x: 48, y: 15, w: 64, h: 45 }, W, H);
    const r = refineMeasure(image, model, "horizontal");
    assert.ok(r);
    const p = toPx(r!, W, H);
    near(p.x0, 40);
    near(p.x1, 100);
    near(p.y0, 15);
    near(p.y1, 45);
  });

  it("finds the gap when the model's marker runs partly onto an icon", () => {
    const model = pct({ x: 62, y: 15, w: 48, h: 30 }, W, H);
    const r = refineMeasure(image, model, "horizontal");
    assert.ok(r);
    const p = toPx(r!, W, H);
    near(p.x0, 40);
    near(p.x1, 100);
  });

  it("keeps the model's values when the real gap is much farther than any plausible error", () => {
    assert.equal(refineMeasure(image, pct({ x: 90, y: 15, w: 30, h: 30 }, W, H), "horizontal"), null);
  });

  it("keeps the model's values when the neighbours cannot be seen (white card on a near-white page)", () => {
    const faint = makeImage(W, H, [{ x: 20, y: 15, w: 20, h: 30, color: [250, 252, 255] }, { x: 100, y: 15, w: 20, h: 30, color: [250, 252, 255] }], [240, 246, 252]);
    assert.equal(refineMeasure(faint, pct({ x: 48, y: 15, w: 64, h: 30 }, W, H), "horizontal"), null);
  });

  it("does not split a gap at a thin divider line", () => {
    const withDivider = makeImage(W, H, [...icons, { x: 69, y: 20, w: 2, h: 20, color: [190, 190, 190] }]);
    const r = refineMeasure(withDivider, pct({ x: 45, y: 15, w: 60, h: 30 }, W, H), "horizontal");
    assert.ok(r);
    const p = toPx(r!, W, H);
    near(p.x0, 40);
    near(p.x1, 100);
  });

  it("keeps the model's values on a busy background", () => {
    const noisy = makeImage(W, H, []);
    const noise = noisy.data as Uint8ClampedArray;
    for (let i = 0; i < W * H; i++) {
      const v = (i * 7919) % 256;
      noise[i * 4] = v;
      noise[i * 4 + 1] = (v * 3) % 256;
      noise[i * 4 + 2] = (v * 5) % 256;
    }
    assert.equal(refineMeasure(noisy, pct({ x: 45, y: 15, w: 60, h: 30 }, W, H), "horizontal"), null);
  });

  it("keeps the values for a marker that spans an element, not a gap", () => {
    assert.equal(refineMeasure(image, pct({ x: 20, y: 15, w: 20, h: 30 }, W, H), "horizontal"), null);
  });

  it("keeps the values when there is no gap near the marker", () => {
    const empty = makeImage(W, H, [{ x: 20, y: 15, w: 20, h: 30 }]);
    assert.equal(refineMeasure(empty, pct({ x: 120, y: 15, w: 30, h: 30 }, W, H), "horizontal"), null);
  });
});

describe("refineMeasure (vertical)", () => {
  const W = 60;
  const H = 200;
  const image = makeImage(W, H, [
    { x: 15, y: 20, w: 30, h: 20 },
    { x: 15, y: 100, w: 30, h: 20 },
  ]);

  it("snaps a vertical marker to the gap between two stacked items", () => {
    const model = pct({ x: 10, y: 48, w: 40, h: 70 }, W, H); // shifted down, too long
    const r = refineMeasure(image, model, "vertical");
    assert.ok(r);
    const p = toPx(r!, W, H);
    near(p.y0, 40);
    near(p.y1, 100);
    near(p.x0, 15);
    near(p.x1, 45);
  });
});

describe("refineAnnotations", () => {
  const W = 200;
  const H = 60;
  const image = makeImage(W, H, [
    { x: 20, y: 15, w: 20, h: 30 },
    { x: 100, y: 15, w: 20, h: 30 },
  ]);
  const base = { id: "a", label: "L", description: "d", status: "found" as const };

  it("changes only distance markers and keeps their other fields", () => {
    const measure: Annotation = {
      ...base,
      kind: "measure",
      axis: "horizontal",
      value: "8mm",
      box: pct({ x: 48, y: 15, w: 64, h: 45 }, W, H),
    };
    const plain: Annotation = { ...base, id: "b", box: pct({ x: 48, y: 15, w: 64, h: 45 }, W, H) };
    const missing: Annotation = { ...base, id: "c", status: "not_found", box: null };
    const [m, p, n] = refineAnnotations([measure, plain, missing], image);
    near(toPx(m.box!, W, H).x0, 40);
    assert.equal(m.value, "8mm");
    assert.equal(m.axis, "horizontal");
    assert.equal(p, plain);
    assert.equal(n, missing);
  });

  it("leaves a marker alone when it cannot be snapped", () => {
    const m: Annotation = {
      ...base,
      kind: "measure",
      axis: "horizontal",
      box: pct({ x: 150, y: 15, w: 30, h: 30 }, W, H),
    };
    assert.equal(refineAnnotations([m], image)[0], m);
  });
});
