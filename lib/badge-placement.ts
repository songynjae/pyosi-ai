import type { AnnotationKind, BoxPercent, MeasureAxis } from "./types";

// corner: on the box's top-left corner (placeBadges no longer picks it: it would cover the target).
// above / below / left / side: centered on that side of the box. right: beside a vertical distance line.
// outTopLeft / outTopRight: docked on that corner, fully outside the box.
export type BadgePlacement =
  | "corner"
  | "above"
  | "below"
  | "right"
  | "outTopLeft"
  | "outTopRight"
  | "left"
  | "side";

// A box under this size (percent of the image, in either direction) is within
// about two badge widths on a typical preview, so a badge on its corner would
// hide the target. 10% covers icons like the Cursor voice icon (6.2% x 8.3%).
// The badge is sized by the image's width (see exportMetrics), so on a wide image
// a height in percent of the image's height is a bigger share of the badge than it
// looks: with the image's aspect (height / width) the height is measured in percent
// of the width when that is smaller, which makes one line of text in a wide
// screenshot (about 12% of the height, 5% of the width) count as small.
export const SMALL_BOX_PERCENT = 10;
// Small boxes this close to the top edge get the badge below instead of above.
const NEAR_TOP_PERCENT = 8;

export function badgePlacement(
  box: BoxPercent,
  kind?: AnnotationKind,
  axis?: MeasureAxis,
  aspect?: number,
): BadgePlacement {
  // A distance line has its marks along the box edges, so the badge never sits on a corner.
  // A vertical line runs between two items stacked above each other, so a badge above it would
  // cover the upper item: it goes beside the line instead.
  if (kind === "measure") {
    if (axis === "vertical") return "right";
    return box.y < NEAR_TOP_PERCENT ? "below" : "above";
  }
  const height = box.height * (aspect !== undefined && aspect > 0 ? Math.min(1, aspect) : 1);
  if (box.width >= SMALL_BOX_PERCENT && height >= SMALL_BOX_PERCENT) {
    return "corner";
  }
  return box.y < NEAR_TOP_PERCENT ? "below" : "above";
}

export type PlaceItem = {
  id: string;
  box: BoxPercent;
  kind?: AnnotationKind;
  axis?: MeasureAxis;
  value?: string;
};

export type Rect = { x: number; y: number; width: number; height: number };
type Size = { width: number; height: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Center of the numbered badge on the image, in image pixels, kept inside the image so it is never
 * cut off. `diameter` is the badge size (24 at scale 1); the offsets scale with it.
 */
export function badgeCenterOf(
  placement: BadgePlacement,
  box: Rect,
  diameter: number,
  size: Size,
): { x: number; y: number } {
  const r = diameter / 2;
  const off = (20 * diameter) / 24; // badge center to the box edge for the side placements
  const dock = 0.75 * r; // badge center to the box corner for the outside-corner placements
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let x = box.x;
  let y = box.y;
  switch (placement) {
    case "corner":
      break;
    case "right": // beside the middle of a vertical line, clear of its 2 px stroke
      x = cx + off;
      y = cy;
      break;
    case "above":
      x = cx;
      y = box.y - off;
      break;
    case "below":
      x = cx;
      y = box.y + box.height + off;
      break;
    case "left":
      x = box.x - off;
      y = cy;
      break;
    case "side":
      x = box.x + box.width + off;
      y = cy;
      break;
    case "outTopLeft":
      x = box.x - dock;
      y = box.y - dock;
      break;
    case "outTopRight":
      x = box.x + box.width + dock;
      y = box.y - dock;
      break;
  }
  return { x: clamp(x, r, size.width - r), y: clamp(y, r, size.height - r) };
}

/**
 * What a distance line occupies on the image, in image pixels: the line with its end caps (caps up
 * to 28 px long, see measureMarks in export-image.ts) and its value label (centered on a horizontal
 * line, left of a vertical one, see valueLabelCenter). `scale` is 1 for a 24 px badge.
 */
export function distanceObstacles(item: PlaceItem, size: Size, scale: number): Rect[] {
  const x = (item.box.x / 100) * size.width;
  const y = (item.box.y / 100) * size.height;
  const w = (item.box.width / 100) * size.width;
  const h = (item.box.height / 100) * size.height;
  const cap = 28 * scale;
  const horizontal = item.axis !== "vertical";
  const half = Math.min(horizontal ? h : w, cap) / 2;
  const marks: Rect = horizontal
    ? { x, y: y + h / 2 - half, width: w, height: half * 2 }
    : { x: x + w / 2 - half, y, width: half * 2, height: h };
  const result = [marks];
  if (item.value) {
    const lw = (item.value.length * 7 + 8) * scale;
    const lh = 17 * scale;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const lx = horizontal ? cx - lw / 2 : cx - 6 * scale - lw;
    result.push({ x: lx, y: cy - lh / 2, width: lw, height: lh });
  }
  return result;
}

// True when the badge circle reaches into the rectangle.
export function circleHitsRect(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nx = clamp(cx, rect.x, rect.x + rect.width);
  const ny = clamp(cy, rect.y, rect.y + rect.height);
  return Math.hypot(cx - nx, cy - ny) < r;
}

// Share of the badge circle's area that lies inside the rectangle (sampled on a 9 x 9 grid).
function circleShareInRect(cx: number, cy: number, r: number, rect: Rect): number {
  const n = 9;
  let inCircle = 0;
  let inBoth = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const px = cx - r + ((i + 0.5) / n) * 2 * r;
      const py = cy - r + ((j + 0.5) / n) * 2 * r;
      if (Math.hypot(px - cx, py - cy) > r) continue;
      inCircle += 1;
      if (px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height) inBoth += 1;
    }
  }
  return inCircle === 0 ? 0 : inBoth / inCircle;
}

// Candidate sides, best first. A badge is never put inside its own box. A big box, and a wide one
// (a line of text, a button), docks it outside its top-left corner, where it is clearly attached;
// a small icon-like box keeps it centered on its usual side (above, or below near the top edge).
const SMALL_ABOVE: BadgePlacement[] = ["above", "below", "outTopLeft", "left", "side", "outTopRight"];
const SMALL_BELOW: BadgePlacement[] = ["below", "above", "outTopLeft", "left", "side", "outTopRight"];
const DOCKED: BadgePlacement[] = ["outTopLeft", "above", "left", "outTopRight", "below", "side"];
const DOCKED_NEAR_TOP: BadgePlacement[] = ["outTopLeft", "below", "left", "outTopRight", "above", "side"];

/**
 * The badge placement of every box. The rule: a badge may not cover what the notes talk about.
 * Distance lines (with their value labels) and the badges placed before it are avoided first, a
 * box's own area next, other boxes' areas last (a button inside a card has to be somewhere); the
 * first candidate with the lowest cost wins, so the usual side is kept whenever it is free.
 * `diameter` and `gap` are the badge size and the badge-to-box distance, in image pixels.
 */
export function placeBadges(
  items: PlaceItem[],
  size: Size,
  diameter: number,
  gap: number,
): Record<string, BadgePlacement> {
  void gap; // the side distance follows from the badge size (see badgeCenterOf)
  const aspect = size.width > 0 ? size.height / size.width : undefined;
  const scale = diameter / 24;
  const r = diameter / 2;
  const px = (b: BoxPercent): Rect => ({
    x: (b.x / 100) * size.width,
    y: (b.y / 100) * size.height,
    width: (b.width / 100) * size.width,
    height: (b.height / 100) * size.height,
  });
  const measures = items.filter((i) => i.kind === "measure");
  const boxes = items.filter((i) => i.kind !== "measure").map((i) => ({ id: i.id, rect: px(i.box) }));
  const obstacles = measures.flatMap((i) => distanceObstacles(i, size, scale));
  const result: Record<string, BadgePlacement> = {};
  const placed: { x: number; y: number }[] = [];

  // A distance line keeps its own rule (beside a vertical line, above or below a horizontal one).
  for (const it of measures) {
    const p = badgePlacement(it.box, it.kind, it.axis, aspect);
    result[it.id] = p;
    placed.push(badgeCenterOf(p, px(it.box), diameter, size));
  }

  for (const it of items) {
    if (it.kind === "measure") continue;
    const usual = badgePlacement(it.box, undefined, undefined, aspect);
    const wide = it.box.width >= SMALL_BOX_PERCENT;
    const order =
      usual === "corner" || wide
        ? usual === "below"
          ? DOCKED_NEAR_TOP
          : DOCKED
        : usual === "above"
          ? SMALL_ABOVE
          : SMALL_BELOW;
    const own = px(it.box);
    let best = order[0];
    let bestCost = Infinity;
    order.forEach((p, i) => {
      const c = badgeCenterOf(p, own, diameter, size);
      let cost = i * 0.01;
      cost += 50 * circleShareInRect(c.x, c.y, r, own);
      for (const o of boxes) if (o.id !== it.id) cost += 4 * circleShareInRect(c.x, c.y, r, o.rect);
      for (const ob of obstacles) if (circleHitsRect(c.x, c.y, r, ob)) cost += 20 + 100 * Math.max(0.01, circleShareInRect(c.x, c.y, r, ob));
      for (const q of placed) {
        const d = Math.hypot(q.x - c.x, q.y - c.y);
        if (d < diameter) cost += 20 + 80 * (1 - d / diameter);
      }
      if (cost < bestCost - 1e-9) {
        best = p;
        bestCost = cost;
      }
    });
    result[it.id] = best;
    placed.push(badgeCenterOf(best, own, diameter, size));
  }
  return result;
}
