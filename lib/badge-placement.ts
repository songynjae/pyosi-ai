import type { AnnotationKind, BoxPercent, MeasureAxis } from "./types";

export type BadgePlacement = "corner" | "above" | "below" | "right";

// A box under this size (percent of the image, in either direction) is within
// about two badge widths on a typical preview, so a badge on its corner would
// hide the target. 10% covers icons like the Cursor voice icon (6.2% x 8.3%).
export const SMALL_BOX_PERCENT = 10;
// Small boxes this close to the top edge get the badge below instead of above.
const NEAR_TOP_PERCENT = 8;

export function badgePlacement(
  box: BoxPercent,
  kind?: AnnotationKind,
  axis?: MeasureAxis,
): BadgePlacement {
  // A distance line has its marks along the box edges, so the badge never sits on a corner.
  // A vertical line runs between two items stacked above each other, so a badge above it would
  // cover the upper item: it goes beside the line instead.
  if (kind === "measure") {
    if (axis === "vertical") return "right";
    return box.y < NEAR_TOP_PERCENT ? "below" : "above";
  }
  if (box.width >= SMALL_BOX_PERCENT && box.height >= SMALL_BOX_PERCENT) {
    return "corner";
  }
  return box.y < NEAR_TOP_PERCENT ? "below" : "above";
}
