import { badgePlacement, type BadgePlacement } from "./badge-placement.ts";
import { separateBadges } from "./badge-layout.ts";
import { capitalizeFirst } from "./format-label.ts";
import type { Annotation, BoxPercent, MeasureAxis } from "./types";

// PNG export at the original image size (never the 2x copy sent to the model).
// Everything that decides positions and sizes is a pure function below and is
// unit-tested; `renderExport` only draws and runs in the browser.

export type ExportFormat = "annotated" | "boxes" | "original";

export const EXPORT_FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "annotated", label: "Annotated (boxes + descriptions)" },
  { id: "boxes", label: "Boxes only" },
  { id: "original", label: "Original image" },
];

export type Size = { width: number; height: number };
export type PixelBox = { x: number; y: number; width: number; height: number };

// The exported image does not follow the page theme, so it stays readable on
// any background it is pasted onto.
const CALLOUT = "#e03131";
const NO_LOCATION = "#8a8a8a";
const TEXT = "#1f1f1f";
const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export type Metrics = {
  /** 1 for images up to 700 px wide; grows with the image so marks stay visible. */
  scale: number;
  stroke: number;
  badge: number;
  badgeFont: number;
  pad: number;
  listFont: number;
  lineHeight: number;
  itemGap: number;
  /** Space left of the description text for the list number circle. */
  indent: number;
};

export function exportMetrics(imageWidth: number): Metrics {
  const s = Math.max(1, imageWidth / 700);
  return {
    scale: s,
    stroke: 2 * s,
    badge: 24 * s,
    badgeFont: 13 * s,
    pad: 16 * s,
    listFont: 14 * s,
    lineHeight: 20 * s,
    itemGap: 8 * s,
    indent: 30 * s,
  };
}

export function pixelBox(box: BoxPercent, size: Size): PixelBox {
  return {
    x: (box.x / 100) * size.width,
    y: (box.y / 100) * size.height,
    width: (box.width / 100) * size.width,
    height: (box.height / 100) * size.height,
  };
}

export type Segment = { x1: number; y1: number; x2: number; y2: number };

/**
 * The marks of a distance line inside its box: the line along the measured
 * axis through the middle of the box, and a cap at each end (at most 28 px
 * long at scale 1). Matches the on-screen drawing.
 */
export function measureMarks(
  box: PixelBox,
  axis: MeasureAxis,
  m: Metrics,
): { line: Segment; caps: [Segment, Segment]; center: { x: number; y: number } } {
  const capMax = 28 * m.scale;
  if (axis === "horizontal") {
    const cy = box.y + box.height / 2;
    const half = Math.min(box.height, capMax) / 2;
    const x2 = box.x + box.width;
    return {
      line: { x1: box.x, y1: cy, x2, y2: cy },
      caps: [
        { x1: box.x, y1: cy - half, x2: box.x, y2: cy + half },
        { x1: x2, y1: cy - half, x2, y2: cy + half },
      ],
      center: { x: box.x + box.width / 2, y: cy },
    };
  }
  const cx = box.x + box.width / 2;
  const half = Math.min(box.width, capMax) / 2;
  const y2 = box.y + box.height;
  return {
    line: { x1: cx, y1: box.y, x2: cx, y2 },
    caps: [
      { x1: cx - half, y1: box.y, x2: cx + half, y2: box.y },
      { x1: cx - half, y1: y2, x2: cx + half, y2 },
    ],
    center: { x: cx, y: box.y + box.height / 2 },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Center of the numbered badge on the image, matching the on-screen rule:
 * on the box's top-left corner, or centered above (below near the top edge)
 * for small boxes. Kept inside the image so it is never cut off.
 */
export function badgeCenter(
  box: PixelBox,
  placement: BadgePlacement,
  m: Metrics,
  size: Size,
): { x: number; y: number } {
  const gap = 20 * m.scale;
  let x = box.x;
  let y = box.y;
  if (placement === "right") {
    // Beside the middle of a vertical line, clear of its 2 px stroke.
    x = box.x + box.width / 2 + 20 * m.scale;
    y = box.y + box.height / 2;
  } else if (placement === "above") {
    x = box.x + box.width / 2;
    y = box.y - gap;
  } else if (placement === "below") {
    x = box.x + box.width / 2;
    y = box.y + box.height + gap;
  }
  const r = m.badge / 2;
  return {
    x: clamp(x, r, size.width - r),
    y: clamp(y, r, size.height - r),
  };
}

/** One line of the description list. Entries without a location say so. */
export function entryText(a: Annotation): string {
  const label = capitalizeFirst(a.label);
  const base = a.description ? `${label}: ${a.description}` : label;
  if (a.status === "not_found") return `${base} (location not found)`;
  if (a.status === "ambiguous") return `${base} (location ambiguous)`;
  return base;
}

/**
 * Greedy word wrap. `measure` returns the width of a string. A word wider than
 * `maxWidth` is split by characters, and every line has at least one character,
 * so it always terminates.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    let rest = word;
    while (rest.length > 1 && measure(rest) > maxWidth) {
      let n = rest.length - 1;
      while (n > 1 && measure(rest.slice(0, n)) > maxWidth) n -= 1;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

export type ListRow = {
  /** Position in the list, same as the number on the image. */
  number: number;
  found: boolean;
  lines: string[];
  /** Top of the row, relative to the top of the list area. */
  y: number;
};

export type ListLayout = { height: number; rows: ListRow[] };

/** Rows and total height of the description list drawn under the image. */
export function layoutList(
  annotations: Annotation[],
  imageWidth: number,
  m: Metrics,
  measure: (s: string) => number,
): ListLayout {
  if (annotations.length === 0) return { height: 0, rows: [] };
  const textWidth = Math.max(imageWidth - 2 * m.pad - m.indent, m.listFont * 4);
  const rows: ListRow[] = [];
  let y = m.pad;
  annotations.forEach((a, i) => {
    const lines = wrapText(entryText(a), textWidth, measure);
    rows.push({
      number: i + 1,
      found: a.status === "found" && a.box !== null,
      lines,
      y,
    });
    y += lines.length * m.lineHeight + m.itemGap;
  });
  return { height: y - m.itemGap + m.pad, rows };
}

/** `<name>-<format>.png`, with characters that are unsafe in file names removed. */
export function exportFileName(base: string | null, format: ExportFormat): string {
  const name = (base ?? "")
    .replace(/\.[^./]+$/, "")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || "pyosi"}-${format}.png`;
}

// ---- Browser only (canvas) -------------------------------------------------

/** Draws the export and returns it as a PNG, or null when the canvas could not be made (e.g. too large). */
export async function renderExport(
  imageSrc: string,
  annotations: Annotation[],
  format: ExportFormat,
): Promise<Blob | null> {
  const blob = await (await fetch(imageSrc)).blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const size = { width: bitmap.width, height: bitmap.height };
    const m = exportMetrics(size.width);
    const listFont = `${m.listFont}px ${FONT_FAMILY}`;

    // Measure with a scratch context first: resizing a canvas resets its state.
    const scratch = document.createElement("canvas").getContext("2d");
    if (!scratch) return null;
    scratch.font = listFont;
    const list =
      format === "annotated"
        ? layoutList(annotations, size.width, m, (s) => scratch.measureText(s).width)
        : { height: 0, rows: [] };

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height + Math.ceil(list.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0);

    const found = annotations
      .map((a, index) => ({ a, index }))
      .filter(({ a }) => a.status === "found" && a.box);
    if (format !== "original") {
      for (const { a } of found) {
        const px = pixelBox(a.box as BoxPercent, size);
        if (a.kind === "measure" && a.axis) {
          drawMeasure(ctx, px, a.axis, a.value, m, listFont);
          continue;
        }
        ctx.fillStyle = "rgba(224, 49, 49, 0.1)";
        ctx.fillRect(px.x, px.y, px.width, px.height);
        ctx.lineWidth = m.stroke;
        ctx.strokeStyle = CALLOUT;
        ctx.strokeRect(px.x, px.y, px.width, px.height);
      }
      // Badges last so no box outline is drawn over a number.
      const centers = found.map(({ a, index }) => {
        const box = a.box as BoxPercent;
        return { a, index, ...badgeCenter(pixelBox(box, size), badgePlacement(box, a.kind, a.axis, size.height / size.width), m, size) };
      });
      const offsets = separateBadges(
        centers.map((c) => ({ id: c.a.id, x: c.x, y: c.y })),
        m.badge,
        size.height,
      );
      for (const c of centers) {
        drawNumber(ctx, c.index + 1, c.x, c.y + (offsets[c.a.id] ?? 0), m.badge, m.badgeFont, CALLOUT);
      }
    }

    if (list.rows.length > 0) {
      const top = size.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, top, size.width, canvas.height - top);
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, top, size.width, Math.max(1, m.scale));
      ctx.font = listFont;
      for (const row of list.rows) {
        const rowTop = top + row.y;
        drawNumber(
          ctx,
          row.number,
          m.pad + m.lineHeight / 2,
          rowTop + m.lineHeight / 2,
          m.lineHeight,
          m.listFont * 0.85,
          row.found ? CALLOUT : NO_LOCATION,
        );
        ctx.fillStyle = TEXT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = listFont;
        row.lines.forEach((line, i) => {
          ctx.fillText(line, m.pad + m.indent, rowTop + (i + 0.5) * m.lineHeight);
        });
      }
    }

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    bitmap.close();
  }
}

function drawMeasure(
  ctx: CanvasRenderingContext2D,
  box: PixelBox,
  axis: MeasureAxis,
  value: string | undefined,
  m: Metrics,
  font: string,
) {
  const marks = measureMarks(box, axis, m);
  ctx.strokeStyle = CALLOUT;
  ctx.lineWidth = m.stroke;
  ctx.lineCap = "butt";
  for (const s of [marks.line, ...marks.caps]) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  if (!value) return;
  ctx.font = `700 ${m.listFont * 0.85}px ${FONT_FAMILY}`;
  const padX = 4 * m.scale;
  const w = ctx.measureText(value).width + 2 * padX;
  const h = m.listFont * 1.2;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillRect(marks.center.x - w / 2, marks.center.y - h / 2, w, h);
  ctx.fillStyle = CALLOUT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, marks.center.x, marks.center.y + 1);
  ctx.font = font;
}

function drawNumber(
  ctx: CanvasRenderingContext2D,
  n: number,
  cx: number,
  cy: number,
  diameter: number,
  fontSize: number,
  color: string,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), cx, cy + fontSize * 0.04);
}
