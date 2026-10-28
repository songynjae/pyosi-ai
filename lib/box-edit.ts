import type { Annotation, BoxPercent } from "./types";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type DragMode = "move" | ResizeHandle;

// Smallest box a resize can produce, in percent of the image. A box that was
// already smaller (a model box on a tiny icon) keeps its own size as the floor.
export const MIN_BOX_PERCENT = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Moves or resizes one axis. "start" drags the left/top edge, "end" the
// right/bottom edge, "move" shifts both. The result always stays in 0-100.
function dragAxis(
  pos: number,
  size: number,
  delta: number,
  part: "move" | "start" | "end" | "none",
): [number, number] {
  const min = Math.min(MIN_BOX_PERCENT, size);
  const end = pos + size;
  switch (part) {
    case "move": {
      const next = clamp(pos + delta, 0, 100 - size);
      return [next, size];
    }
    case "start": {
      const next = clamp(pos + delta, 0, end - min);
      return [next, end - next];
    }
    case "end": {
      const next = clamp(end + delta, pos + min, 100);
      return [pos, next - pos];
    }
    default:
      return [pos, size];
  }
}

/**
 * The box after dragging `start` by (dx, dy) percent of the image, from the
 * box as it was when the drag began. The result is always a valid box.
 */
export function applyDrag(
  start: BoxPercent,
  mode: DragMode,
  dx: number,
  dy: number,
): BoxPercent {
  const [x, width] = dragAxis(
    start.x,
    start.width,
    dx,
    mode === "move"
      ? "move"
      : mode.includes("w")
        ? "start"
        : mode.includes("e")
          ? "end"
          : "none",
  );
  const [y, height] = dragAxis(
    start.y,
    start.height,
    dy,
    mode === "move"
      ? "move"
      : mode.includes("n")
        ? "start"
        : mode.includes("s")
          ? "end"
          : "none",
  );
  return { x, y, width, height };
}

/** Replaces the box of one `found` annotation. Other entries are returned as they were. */
export function setAnnotationBox(
  annotations: Annotation[],
  id: string,
  box: BoxPercent,
): Annotation[] {
  return annotations.map((a) =>
    a.id === id && a.status === "found" ? { ...a, box } : a,
  );
}

/** Removes a whole annotation (its list entry too). Numbers follow list order, so later ones shift up. */
export function removeAnnotation(
  annotations: Annotation[],
  id: string,
): Annotation[] {
  return annotations.filter((a) => a.id !== id);
}

/**
 * Replaces the label and description of one annotation (any status). Both are
 * trimmed. The label must stay non-empty (the schema requires it), so an empty
 * label leaves the list unchanged; an empty description is allowed.
 */
export function setAnnotationText(
  annotations: Annotation[],
  id: string,
  text: { label: string; description: string },
): Annotation[] {
  const label = text.label.trim();
  if (label === "") return annotations;
  const description = text.description.trim();
  return annotations.map((a) => (a.id === id ? { ...a, label, description } : a));
}
