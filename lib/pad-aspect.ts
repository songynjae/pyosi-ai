import type { BoxPercent } from "./types";

// Very wide screenshots (e.g. a browser toolbar, 3.45:1) gave boxes that were
// too tall and shifted sideways; the same image with white padding up to 2:1
// fixed the horizontal error (see docs/development-log.md, section 2,
// padding). The padding goes below the image only: with padding above it
// every box came back about 13 px too low, with padding below only all edges
// were within 3 px. The padded copy is only what the model sees: boxes it
// returns are mapped back to the original image here, so nothing else changes.
//
// Tall phone screenshots (390x844, 2.16:1) gave boxes whose vertical position
// varied by tens of pixels from run to run. Sent with white padding on the right
// up to a square, 18 of 24 runs on a screen not used to choose the method passed
// against 10 of 24 without (docs/eval-log.md, 2026-10-31). Only images between
// 2:1 and 3:1 tall were tested; taller ones are sent as before.
export const PAD_ABOVE_ASPECT = 2.5;
export const PAD_TARGET_ASPECT = 2;
export const PAD_TALL_ABOVE_ASPECT = 2;
export const PAD_TALL_UP_TO_ASPECT = 3;

export type Size = { width: number; height: number };

/** Where the original sits inside the padded image (top-left corner), in original-image pixels. */
export type PadPlan = {
  /** Size of the original image. */
  original: Size;
  /** Size of the padded image (taller for a wide image, wider for a tall one). */
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

/** The padding to send, or null when the image does not need it. */
export function planPad(original: Size): PadPlan | null {
  const { width, height } = original;
  if (!(width > 0 && height > 0)) return null;
  if (width / height > PAD_ABOVE_ASPECT) {
    return {
      original,
      width,
      height: Math.round(width / PAD_TARGET_ASPECT),
      offsetX: 0,
      offsetY: 0,
    };
  }
  const tall = height / width;
  if (tall > PAD_TALL_ABOVE_ASPECT && tall <= PAD_TALL_UP_TO_ASPECT) {
    // A square, with the image at the left.
    return { original, width: height, height, offsetX: 0, offsetY: 0 };
  }
  return null;
}

/** A box in percent of the padded image -> percent of the original image. May fall outside 0-100 when the model boxed the padding. */
export function mapBoxFromPadded(box: BoxPercent, plan: PadPlan): BoxPercent {
  const { original } = plan;
  return {
    x: (((box.x / 100) * plan.width - plan.offsetX) / original.width) * 100,
    y: (((box.y / 100) * plan.height - plan.offsetY) / original.height) * 100,
    width: ((box.width / 100) * plan.width / original.width) * 100,
    height: ((box.height / 100) * plan.height / original.height) * 100,
  };
}

function isBox(value: unknown): value is BoxPercent {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every((k) => typeof b[k] === "number");
}

/**
 * Maps the `box` of every entry of the route's response back to the original
 * image. Anything that is not a box is passed through untouched, so validation
 * still reports it. Boxes are not clamped: one that ends up outside the image
 * is reported as invalid like any other bad box.
 */
export function mapAnnotationsFromPadded(annotations: unknown, plan: PadPlan): unknown {
  if (!Array.isArray(annotations)) return annotations;
  return annotations.map((entry) => {
    if (typeof entry !== "object" || entry === null || !isBox((entry as { box?: unknown }).box)) {
      return entry;
    }
    const e = entry as { box: BoxPercent };
    return { ...e, box: mapBoxFromPadded(e.box, plan) };
  });
}
