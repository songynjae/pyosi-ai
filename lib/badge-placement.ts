import type { AnnotationKind, BoxPercent, MeasureAxis } from "./types";

export type BadgePlacement = "corner" | "above" | "below" | "right";

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
