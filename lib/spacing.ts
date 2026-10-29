import { gridBoxToPercent, isGridBox } from "./grounding.ts";
import type { BoxPercent, MeasureAxis } from "./types";

// Distance lines. The model locates the elements (what it is good at); the gap
// between them is computed here, so it is exact for the boxes it gave.

export type Measure = { box: BoxPercent; axis: MeasureAxis };

const EPSILON = 1e-9;

/**
 * The empty span between two elements that sit side by side (horizontal) or
 * one above the other (vertical). The span runs along the shared edge range.
 * Null when they overlap, touch, or are only diagonal neighbours.
 */
export function gapBetween(a: BoxPercent, b: BoxPercent): Measure | null {
  const aRight = a.x + a.width;
  const bRight = b.x + b.width;
  const aBottom = a.y + a.height;
  const bBottom = b.y + b.height;
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(aBottom, bBottom);
  const left = Math.max(a.x, b.x);
  const right = Math.min(aRight, bRight);

  if (bottom - top > EPSILON) {
    const height = bottom - top;
    if (b.x - aRight > EPSILON) {
      return { axis: "horizontal", box: { x: aRight, y: top, width: b.x - aRight, height } };
    }
    if (a.x - bRight > EPSILON) {
      return { axis: "horizontal", box: { x: bRight, y: top, width: a.x - bRight, height } };
    }
  }
  if (right - left > EPSILON) {
    const width = right - left;
    if (b.y - aBottom > EPSILON) {
      return { axis: "vertical", box: { x: left, y: aBottom, width, height: b.y - aBottom } };
    }
    if (a.y - bBottom > EPSILON) {
      return { axis: "vertical", box: { x: left, y: bBottom, width, height: a.y - bBottom } };
    }
  }
  return null;
}

/** Shortest marker drawn for a gap, in percent of the image, so a very thin or missing gap still shows. */
export const MIN_MARKER_PERCENT = 1.5;

type Range = [number, number];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function rangesOf(box: BoxPercent, axis: MeasureAxis): { main: Range; cross: Range } {
  return axis === "horizontal"
    ? { main: [box.x, box.x + box.width], cross: [box.y, box.y + box.height] }
    : { main: [box.y, box.y + box.height], cross: [box.x, box.x + box.width] };
}

function boxFromRanges(axis: MeasureAxis, main: Range, cross: Range): BoxPercent {
  return axis === "horizontal"
    ? { x: main[0], y: cross[0], width: main[1] - main[0], height: cross[1] - cross[0] }
    : { x: cross[0], y: main[0], width: cross[1] - cross[0], height: main[1] - main[0] };
}

/**
 * The marker for the space between two identified elements. The exact gap is
 * used when there is one. When the model's boxes overlap, touch or sit
 * diagonally, the marker is a short one centered between their facing edges,
 * so an identified gap is still shown (the user can adjust it) and nothing is
 * reported as a failure. The distance itself is never shown as a number: the
 * only text on a marker is the value the notes give.
 */
export function markerBetween(a: BoxPercent, b: BoxPercent, axisHint?: unknown): Measure {
  const exact = gapBetween(a, b);
  const axis: MeasureAxis =
    exact?.axis ??
    (axisHint === "horizontal" || axisHint === "vertical"
      ? axisHint
      : Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) >=
          Math.abs(a.y + a.height / 2 - (b.y + b.height / 2))
        ? "horizontal"
        : "vertical");

  const ra = rangesOf(a, axis);
  const rb = rangesOf(b, axis);
  const [first, second] =
    ra.main[0] + ra.main[1] <= rb.main[0] + rb.main[1] ? [ra, rb] : [rb, ra];

  let start = first.main[1];
  let end = second.main[0];
  if (end - start < MIN_MARKER_PERCENT) {
    const mid = (start + end) / 2;
    start = clamp(mid - MIN_MARKER_PERCENT / 2, 0, 100 - MIN_MARKER_PERCENT);
    end = start + MIN_MARKER_PERCENT;
  }

  let crossStart = Math.max(ra.cross[0], rb.cross[0]);
  let crossEnd = Math.min(ra.cross[1], rb.cross[1]);
  if (crossEnd - crossStart <= EPSILON) {
    // No shared range (diagonal): span the shorter element around the middle of the two.
    const center = (ra.cross[0] + ra.cross[1] + rb.cross[0] + rb.cross[1]) / 4;
    const size = Math.min(ra.cross[1] - ra.cross[0], rb.cross[1] - rb.cross[0]);
    crossStart = clamp(center - size / 2, 0, 100 - size);
    crossEnd = crossStart + size;
  }
  return { axis, box: boxFromRanges(axis, [start, end], [crossStart, crossEnd]) };
}

/** A row or column of items the model located in one go (boxes on the 0-1000 grid). */
export type Group = {
  id: string;
  axis: unknown;
  items: { label: string; box: [number, number, number, number] }[];
};

/** Reads the model's `groups`. Items without a label or a well-formed box are left out, so nothing can point at them. */
export function parseGroups(raw: unknown): Group[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((g): Group[] => {
    const r = (g ?? {}) as Record<string, unknown>;
    if (typeof r.id !== "string" || !Array.isArray(r.items)) return [];
    const items = r.items.flatMap((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      return typeof o.label === "string" && isGridBox(o.box_2d) ? [{ label: o.label, box: o.box_2d }] : [];
    });
    return [{ id: r.id, axis: r.axis, items }];
  });
}

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Why a measurement entry could not be turned into a distance marker, in words
 * a person can act on (which group or item name was not found, and what was
 * available). Used for the "invalid annotation" message instead of the generic
 * "a found annotation requires a box".
 */
export function explainMeasureProblem(
  entry: { group?: unknown; between?: unknown; of?: unknown; axis?: unknown },
  groups: Group[],
): string {
  const ids = groups.map((g) => `"${g.id}"`).join(", ") || "none";
  if (typeof entry.group !== "string") return `measurement has no group (groups: ${ids})`;
  const group = groups.find((g) => g.id === entry.group);
  if (!group) return `measurement points at group "${entry.group}", which was not returned (groups: ${ids})`;
  const labels = group.items.map((it) => `"${it.label}"`).join(", ") || "no usable items";
  const missing = (label: unknown) =>
    typeof label !== "string" || !group.items.some((it) => sameLabel(it.label, label));
  if (Array.isArray(entry.between)) {
    if (entry.between.length !== 2) return `measurement "between" needs exactly two item names, got ${entry.between.length}`;
    const bad = entry.between.filter(missing);
    if (bad.length > 0) {
      return `measurement item ${bad.map((b) => `"${String(b)}"`).join(", ")} not found in group "${group.id}" (items: ${labels})`;
    }
    return `measurement "between" names the same item twice in group "${group.id}"`;
  }
  if (typeof entry.of === "string") {
    if (missing(entry.of)) return `measurement item "${entry.of}" not found in group "${group.id}" (items: ${labels})`;
    return `measurement of "${entry.of}" needs an axis of horizontal or vertical`;
  }
  return `measurement names no items: it needs "between" (two item names) or "of" (one item name)`;
}

/**
 * Turns a measurement entry into a distance marker, using the group of items
 * the model located once (tight boxes for the whole row or column) instead of
 * a pair per gap: `between` names the two items the gap lies between, `of` one
 * item whose width or height (`axis`) is meant. Items are found by label.
 * Null when the entry does not point at usable items, so the caller can leave
 * it to validation (nothing is guessed).
 */
export function resolveMeasure(
  entry: { group?: unknown; between?: unknown; of?: unknown; axis?: unknown },
  groups: Group[],
): Measure | null {
  const group = typeof entry.group === "string" ? groups.find((g) => g.id === entry.group) : undefined;
  if (!group) return null;
  const find = (label: unknown) =>
    typeof label === "string" ? group.items.find((it) => sameLabel(it.label, label)) : undefined;

  if (Array.isArray(entry.between) && entry.between.length === 2) {
    const a = find(entry.between[0]);
    const b = find(entry.between[1]);
    if (!a || !b || a === b) return null;
    return markerBetween(gridBoxToPercent(a.box), gridBoxToPercent(b.box), group.axis);
  }
  if (typeof entry.of === "string") {
    const item = find(entry.of);
    if (!item || (entry.axis !== "horizontal" && entry.axis !== "vertical")) return null;
    return { box: gridBoxToPercent(item.box), axis: entry.axis };
  }
  return null;
}
