import { MAX_IMAGE_BYTES } from "./image-validation.ts";
import { planPad, type PadPlan } from "./pad-aspect.ts";

// Small screenshots gave noisy boxes (see docs/development-log.md, M2.2-C):
// at 2x the same pixels were accurate and repeatable in every case tried.
// Boxes are percentages, so the overlay is unaffected by the size we send.
export const UPSCALE_BELOW_LONG_SIDE = 1400;
export const UPSCALE_FACTOR = 2;

export type Size = { width: number; height: number };

/** The size to send, or null when the image is large enough to send as is. */
export function planUpscale({ width, height }: Size): Size | null {
  if (!(width > 0 && height > 0)) return null;
  if (Math.max(width, height) >= UPSCALE_BELOW_LONG_SIDE) return null;
  return { width: width * UPSCALE_FACTOR, height: height * UPSCALE_FACTOR };
}

export type UpscaleDeps = {
  /** Decodes the file; rejects when the browser cannot read it. */
  decode: (file: File) => Promise<{ size: Size; source: unknown }>;
  /**
   * Draws `source` at the target size and encodes it as PNG; null on failure.
   * With `placement` the canvas is filled white first and `source` is drawn at
   * that rectangle (padding around it).
   */
  render: (
    source: unknown,
    size: Size,
    placement?: { x: number; y: number; width: number; height: number },
  ) => Promise<Blob | null>;
};

/**
 * Returns an upscaled PNG copy of small images, otherwise the original file.
 * Any failure (undecodable image, canvas error, result over the upload limit)
 * falls back to the original so Generate still works.
 */
export async function upscaleImage(
  file: File,
  deps: UpscaleDeps = browserDeps,
): Promise<File> {
  try {
    const { size, source } = await deps.decode(file);
    const target = planUpscale(size);
    if (!target) return file;
    const blob = await deps.render(source, target);
    if (!blob || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) return file;
    const name = file.name.replace(/\.[^./]+$/, "") + "-2x.png";
    return new File([blob], name, { type: "image/png" });
  } catch {
    return file;
  }
}

export type Prepared = {
  file: File;
  /** Set when white padding was added; boxes from the model must be mapped back (lib/pad-aspect.ts). */
  pad: PadPlan | null;
};

/**
 * The copy of the image that is sent to the model: very wide images get white
 * padding below, up to 2:1, tall phone-shaped images white padding on the right,
 * up to a square, and small images are upscaled 2x, in one drawing step.
 * Anything else is sent as it is. Any failure falls back to the original file
 * with no padding, so Generate still works.
 */
export async function prepareImage(
  file: File,
  deps: UpscaleDeps = browserDeps,
): Promise<Prepared> {
  try {
    const { size, source } = await deps.decode(file);
    const pad = planPad(size);
    const factor = planUpscale(size) ? UPSCALE_FACTOR : 1;
    if (!pad && factor === 1) return { file, pad: null };
    const canvas = pad
      ? { width: pad.width * factor, height: pad.height * factor }
      : { width: size.width * factor, height: size.height * factor };
    const placement = pad
      ? {
          x: pad.offsetX * factor,
          y: pad.offsetY * factor,
          width: size.width * factor,
          height: size.height * factor,
        }
      : undefined;
    const blob = await deps.render(source, canvas, placement);
    if (!blob || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) return { file, pad: null };
    const suffix = `${pad ? "-padded" : ""}${factor === 2 ? "-2x" : ""}`;
    const name = file.name.replace(/\.[^./]+$/, "") + suffix + ".png";
    return { file: new File([blob], name, { type: "image/png" }), pad };
  } catch {
    return { file, pad: null };
  }
}

// Browser implementation (canvas). Not used by the unit tests.
const browserDeps: UpscaleDeps = {
  async decode(file) {
    const bitmap = await createImageBitmap(file);
    return { size: { width: bitmap.width, height: bitmap.height }, source: bitmap };
  },
  async render(source, { width, height }, placement) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (placement) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(source as ImageBitmap, placement.x, placement.y, placement.width, placement.height);
    } else {
      ctx.drawImage(source as ImageBitmap, 0, 0, width, height);
    }
    (source as ImageBitmap).close();
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  },
};
