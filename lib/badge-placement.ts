import type { BoxPercent } from "./types";

export type BadgePlacement = "corner" | "above" | "below";

// A box under this size (percent of the image, in either direction) is within
// about two badge widths on a typical preview, so a badge on its corner would
// hide the target. 10% covers icons like the Cursor voice icon (6.2% x 8.3%).
export const SMALL_BOX_PERCENT = 10;
// Small boxes this close to the top edge get the badge below instead of above.
const NEAR_TOP_PERCENT = 8;

export function badgePlacement(box: BoxPercent): BadgePlacement {
  if (box.width >= SMALL_BOX_PERCENT && box.height >= SMALL_BOX_PERCENT) {
    return "corner";
  }
  return box.y < NEAR_TOP_PERCENT ? "below" : "above";
}
