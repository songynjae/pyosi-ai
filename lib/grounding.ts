/**
 * Meta Muse Spark returns boxes as [x_min, y_min, x_max, y_max] on a 0-1000
 * grid with a top-left origin (verified in the M2.2-B spike, see
 * docs/m2-2b-api-spike.md). Pyosi stores x/y/width/height in percent (0-100).
 *
 * The conversion does not clamp or repair: out-of-range or inverted boxes
 * come out invalid and are rejected by parseAnnotations().
 */
export const GRID_SIZE = 1000;

export function isGridBox(value: unknown): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

export function gridBoxToPercent([x1, y1, x2, y2]: [number, number, number, number]) {
  const scale = 100 / GRID_SIZE;
  return {
    x: x1 * scale,
    y: y1 * scale,
    width: (x2 - x1) * scale,
    height: (y2 - y1) * scale,
  };
}
