import type { Annotation, BoxPercent, MeasureAxis } from "./types";

// The model finds the items around a gap well but its boxes are a few pixels
// loose (see docs/development-log.md, section 2,
// distance notes), which moves a distance line off the
// real gap. Here the line's ends are snapped to the real edges of the two
// neighbouring items by looking at the pixels of the original image. When the
// image is not plain enough to be sure, the model's values are kept.

/** RGBA pixels, like the browser's ImageData. */
export type PixelImage = { width: number; height: number; data: ArrayLike<number> };

// A pixel differs from the background when some channel is more than this away
// (a light grey pill on white does not count, a light blue one does).
export const INK_DIFF = 30;
// The background must cover at least this much of the area that is looked at, and the
// empty stretch that is chosen must be flat (no gradient or texture).
const MIN_BACKGROUND_SHARE = 0.25;
const MAX_RUN_DEVIATION = 20;
// Each neighbour of the gap must really be there: at least this share of the pixels beside the
// gap is ink (a white card on a near-white background is not seen, so it must not be trusted).
const MIN_NEIGHBOUR_INK = 0.04;
// The gap may move at most this far from where the model put each end: the larger of a
// fraction of the marker's length and a fixed number of pixels.
const MAX_SHIFT_FRACTION = 0.6;
const MAX_SHIFT_PX = 24;
// A marker whose span is this inked is not a gap (it measures an element).
const MAX_INK_IN_SPAN = 0.75;

type Range = [number, number];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Snaps a distance marker to the real gap in the image: its length to the empty
 * stretch between the two neighbours, and its cross position to where both
 * neighbours actually are. Returns null (keep the model's values) when the area
 * is not a plain background, no empty stretch is found near the marker, or the
 * marker spans an element rather than a gap.
 */
export function refineMeasure(
  image: PixelImage,
  box: BoxPercent,
  axis: MeasureAxis,
): BoxPercent | null {
  const horizontal = axis === "horizontal";
  const mainSize = horizontal ? image.width : image.height;
  const crossSize = horizontal ? image.height : image.width;
  const at = (m: number, c: number): [number, number, number] => {
    const k = (horizontal ? c * image.width + m : m * image.width + c) * 4;
    return [image.data[k], image.data[k + 1], image.data[k + 2]];
  };

  const main0 = (horizontal ? box.x : box.y) / 100 * mainSize;
  const mainLen = (horizontal ? box.width : box.height) / 100 * mainSize;
  const cross0 = (horizontal ? box.y : box.x) / 100 * crossSize;
  const crossLen = (horizontal ? box.height : box.width) / 100 * crossSize;
  const main1 = main0 + mainLen;
  if (!(mainLen > 0 && crossLen > 0) || mainSize < 8 || crossSize < 8) return null;

  // Where to look: a window along the line, and a band across it (the model's whole
  // cross range, less its last two pixels).
  const reach = Math.max(24, Math.round(1.5 * mainLen));
  const w0 = clamp(Math.floor(main0 - reach), 0, mainSize - 1);
  const w1 = clamp(Math.ceil(main1 + reach), 0, mainSize - 1);
  let b0 = clamp(Math.round(cross0), 0, crossSize - 1);
  let b1 = clamp(Math.round(cross0 + crossLen) - 2, 0, crossSize - 1);
  if (b1 - b0 < 2) {
    b0 = clamp(b0 - 1, 0, crossSize - 1);
    b1 = clamp(b0 + 2, 0, crossSize - 1);
  }
  if (w1 - w0 < 6) return null;

  // Background: the median colour of the band across the window.
  const sampleStep = Math.max(1, Math.floor(((w1 - w0 + 1) * (b1 - b0 + 1)) / 4000));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  let n = 0;
  for (let m = w0; m <= w1; m++) {
    for (let c = b0; c <= b1; c++) {
      if (n++ % sampleStep !== 0) continue;
      const [r, g, b] = at(m, c);
      rs.push(r);
      gs.push(g);
      bs.push(b);
    }
  }
  const bg = [median(rs), median(gs), median(bs)];
  const isInk = (m: number, c: number) => {
    const p = at(m, c);
    return Math.max(Math.abs(p[0] - bg[0]), Math.abs(p[1] - bg[1]), Math.abs(p[2] - bg[2])) > INK_DIFF;
  };

  // Which columns hold ink: the window plus one more reach on each side, so a gap that
  // starts just outside the window still has its bounding ink in view.
  const e0 = clamp(w0 - reach, 0, mainSize - 1);
  const e1 = clamp(w1 + reach, 0, mainSize - 1);
  const ink: boolean[] = [];
  let plain = 0;
  let total = 0;
  for (let m = e0; m <= e1; m++) {
    let any = false;
    for (let c = b0; c <= b1; c++) {
      const hit = isInk(m, c);
      if (m >= w0 && m <= w1) {
        total += 1;
        if (!hit) plain += 1;
      }
      any = any || hit;
    }
    ink.push(any);
  }
  if (plain / total < MIN_BACKGROUND_SHARE) return null;

  // Ink in the model's span: an element, not a gap.
  const s0 = clamp(Math.floor(main0), w0, w1) - e0;
  const s1 = clamp(Math.ceil(main1), w0, w1) - e0;
  if (s1 >= s0) {
    const inked = ink.slice(s0, s1 + 1).filter(Boolean).length;
    if (inked / (s1 - s0 + 1) > MAX_INK_IN_SPAN) return null;
  }

  const inkBeforeMerge = [...ink];
  // A thin line (a divider) between two wide empty stretches is not an item: merge across it.
  const runsOf = (value: boolean): Range[] => {
    const runs: Range[] = [];
    let start = -1;
    for (let i = 0; i <= ink.length; i++) {
      const match = i < ink.length && ink[i] === value;
      if (match && start < 0) start = i;
      if (!match && start >= 0) {
        runs.push([start, i - 1]);
        start = -1;
      }
    }
    return runs;
  };
  const thin = Math.max(2, Math.round(mainSize * 0.004));
  const gaps = runsOf(false);
  const inks = runsOf(true);
  for (const [a, b] of inks) {
    if (b - a + 1 > thin) continue;
    const before = gaps.find((g) => g[1] === a - 1);
    const after = gaps.find((g) => g[0] === b + 1);
    // Both sides must be wide: the hollow inside an icon next to one of its thin strokes is short.
    const wide = Math.max(10, Math.round(0.2 * mainLen));
    if (before && after && before[1] - before[0] + 1 >= wide && after[1] - after[0] + 1 >= wide) {
      for (let i = a; i <= b; i++) ink[i] = false;
    }
  }

  // Empty stretches with ink on both sides, long enough not to be a hole inside an icon.
  const minRun = Math.max(3, Math.round(0.25 * mainLen));
  const candidates = runsOf(false).filter(
    ([a, b]) => a > 0 && b < ink.length - 1 && b - a + 1 >= minRun,
  );
  const mid = (main0 + main1) / 2;
  let best: { run: Range; overlap: number; dist: number } | null = null;
  for (const run of candidates) {
    const r0 = run[0] + e0;
    const r1 = run[1] + e0 + 1;
    const overlap = Math.max(0, Math.min(r1, main1) - Math.max(r0, main0));
    const dist = Math.abs((r0 + r1) / 2 - mid);
    if (!best || overlap > best.overlap || (overlap === best.overlap && dist < best.dist)) {
      best = { run, overlap, dist };
    }
  }
  if (!best || (best.overlap === 0 && best.dist > reach)) return null;
  const gapStart = best.run[0] + e0;
  const gapEnd = best.run[1] + e0 + 1;

  // The chosen stretch must be flat: a gradient or a texture is not a gap to snap to.
  const flat: number[][] = [[], [], []];
  for (let m = gapStart; m < gapEnd; m++) {
    if (inkBeforeMerge[m - e0]) continue; // a divider that was merged over
    for (let c = b0; c <= b1; c++) {
      const p = at(m, c);
      for (let ch = 0; ch < 3; ch++) flat[ch].push(p[ch]);
    }
  }
  const flatMedian = flat.map(median);
  // A few off pixels (the soft edge of a divider) are fine; a texture or gradient is not.
  const outliers = flat[0].filter(
    (_, i) => [0, 1, 2].some((ch) => Math.abs(flat[ch][i] - flatMedian[ch]) > MAX_RUN_DEVIATION),
  ).length;
  if (flat[0].length === 0 || outliers / flat[0].length > 0.1) return null;

  const maxShift = Math.max(MAX_SHIFT_PX, MAX_SHIFT_FRACTION * mainLen);
  if (Math.abs(gapStart - main0) > maxShift || Math.abs(gapEnd - main1) > maxShift) return null;

  // Both neighbours must be clearly there.
  const sideWidth = Math.max(16, Math.round(0.055 * mainSize));
  const density = (from: number, to: number) => {
    let hits = 0;
    let count = 0;
    for (let m = clamp(from, 0, mainSize - 1); m <= clamp(to, 0, mainSize - 1); m++) {
      for (let c = b0; c <= b1; c++) {
        count += 1;
        if (isInk(m, c)) hits += 1;
      }
    }
    return count === 0 ? 0 : hits / count;
  };
  if (
    density(gapStart - sideWidth, gapStart - 1) < MIN_NEIGHBOUR_INK ||
    density(gapEnd, gapEnd + sideWidth - 1) < MIN_NEIGHBOUR_INK
  ) {
    return null;
  }

  // Cross position: where both neighbours really are (their ink, near the model's cross range).
  const margin = Math.max(6, Math.round(0.03 * crossSize));
  const k0 = clamp(Math.floor(cross0 - margin), 0, crossSize - 1);
  const k1 = clamp(Math.ceil(cross0 + crossLen + margin), 0, crossSize - 1);
  const reachOf = (from: number, to: number): Range | null => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let m = clamp(from, 0, mainSize - 1); m <= clamp(to, 0, mainSize - 1); m++) {
      for (let c = k0; c <= k1; c++) {
        if (isInk(m, c)) {
          lo = Math.min(lo, c);
          hi = Math.max(hi, c);
        }
      }
    }
    return hi >= lo ? [lo, hi + 1] : null;
  };
  const left = reachOf(gapStart - sideWidth, gapStart - 1);
  const right = reachOf(gapEnd, gapEnd + sideWidth - 1);
  let crossStart = cross0;
  let crossEnd = cross0 + crossLen;
  if (left && right) {
    const lo = Math.max(left[0], right[0]);
    const hi = Math.min(left[1], right[1]);
    if (hi - lo >= 3) {
      crossStart = lo;
      crossEnd = hi;
    }
  }

  const refined: BoxPercent = horizontal
    ? {
        x: (gapStart / mainSize) * 100,
        width: ((gapEnd - gapStart) / mainSize) * 100,
        y: (crossStart / crossSize) * 100,
        height: ((crossEnd - crossStart) / crossSize) * 100,
      }
    : {
        y: (gapStart / mainSize) * 100,
        height: ((gapEnd - gapStart) / mainSize) * 100,
        x: (crossStart / crossSize) * 100,
        width: ((crossEnd - crossStart) / crossSize) * 100,
      };
  return refined;
}

/** Snaps every distance marker that can be snapped; everything else is returned as it was. */
export function refineAnnotations(annotations: Annotation[], image: PixelImage): Annotation[] {
  return annotations.map((a) => {
    if (a.kind !== "measure" || !a.axis || a.status !== "found" || !a.box) return a;
    const box = refineMeasure(image, a.box, a.axis);
    return box ? { ...a, box } : a;
  });
}
