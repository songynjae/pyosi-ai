// Keeps numbered badges from covering each other. Badges are placed by the
// per-box rule in badge-placement.ts; this only nudges a badge that would
// overlap one placed before it. The earlier entry keeps its place, the later
// one moves up by one badge (or down when there is no room above).

export type BadgePoint = { id: string; x: number; y: number };

const GAP = 2;

/** Vertical offset in px per badge id (0 when it does not move). */
export function separateBadges(
  points: BadgePoint[],
  diameter: number,
  imageHeight: number,
): Record<string, number> {
  const offsets: Record<string, number> = {};
  const placed: { x: number; y: number }[] = [];
  const step = diameter + GAP;
  const r = diameter / 2;
  const overlaps = (x: number, y: number) =>
    placed.some((p) => Math.hypot(p.x - x, p.y - y) < diameter);

  for (const p of points) {
    let chosen = 0;
    for (const dy of [0, -step, step, -2 * step, 2 * step, -3 * step, 3 * step]) {
      const y = p.y + dy;
      if (y < r || y > imageHeight - r) continue;
      if (!overlaps(p.x, y)) {
        chosen = dy;
        break;
      }
    }
    offsets[p.id] = chosen;
    placed.push({ x: p.x, y: p.y + chosen });
  }
  return offsets;
}
