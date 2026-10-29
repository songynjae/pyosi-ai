import type { PixelImage } from "./refine-gap.ts";

// Browser only: the pixels of the original image, for snapping distance lines
// (lib/refine-gap.ts). Very large images are skipped, and any failure returns
// null, so the model's values are used as they are.
const MAX_PIXELS = 16_000_000;

export async function loadPixels(image: Blob): Promise<PixelImage | null> {
  try {
    const bitmap = await createImageBitmap(image);
    try {
      if (bitmap.width * bitmap.height > MAX_PIXELS) return null;
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}
