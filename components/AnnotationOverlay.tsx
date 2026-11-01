"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { badgePlacement, placeBadges, type BadgePlacement } from "@/lib/badge-placement";
import { separateBadges } from "@/lib/badge-layout";
import { applyDrag, type DragMode, type ResizeHandle } from "@/lib/box-edit";
import { badgeCenter, exportMetrics, pixelBox } from "@/lib/export-image";
import type { Annotation, BoxPercent } from "@/lib/types";
import styles from "./AnnotationOverlay.module.css";

// Renders bounding boxes and numbered callouts over the screenshot.
// Positions are percentages, so the overlay scales with the image.
// The number is the entry's position in `annotations` (same as the list), so
// annotations without a location leave a gap instead of shifting the rest.
// A "measure" annotation is drawn as a distance line with end caps over its box
// (the box is the measured span) instead of a filled box.
// Small boxes get their badge above (or below, near the top edge) so it does
// not cover the target.
// Boxes can be selected, moved and resized with pointer events (mouse, touch
// and pen share one path); the drag math lives in lib/box-edit.ts.
const PLACEMENT_CLASS = {
  corner: "",
  above: styles.badgeAbove,
  below: styles.badgeBelow,
  right: styles.badgeRight,
  outTopLeft: styles.badgeOutTopLeft,
  outTopRight: styles.badgeOutTopRight,
  left: styles.badgeLeft,
  side: styles.badgeSide,
};

// Normal boxes have their badge on the top-left corner, so they get no "nw"
// handle (it would hide the number); that corner is reached with "n" then "w".
// A badge docked on the top-left corner also leaves that corner without a handle.
const ALL_HANDLES: ResizeHandle[] = ["n", "ne", "e", "se", "s", "sw", "w"];
const FULL_HANDLES: ResizeHandle[] = ["nw", ...ALL_HANDLES];
const CORNER_HANDLES: ResizeHandle[] = ["nw", "ne", "se", "sw"];
const CORNER_HANDLES_NO_NW: ResizeHandle[] = ["ne", "se", "sw"];

type Drag = {
  id: string;
  mode: DragMode;
  pointerId: number;
  startX: number;
  startY: number;
  startBox: BoxPercent;
  width: number;
  height: number;
};

function handlesFor(placement: BadgePlacement, small: boolean): ResizeHandle[] {
  const docked = placement === "outTopLeft" || placement === "corner";
  if (small) return docked ? CORNER_HANDLES_NO_NW : CORNER_HANDLES;
  return docked ? ALL_HANDLES : FULL_HANDLES;
}

export function AnnotationOverlay({
  annotations,
  selectedId,
  onSelect,
  onChangeBox,
}: {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChangeBox: (id: string, box: BoxPercent) => void;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  // The overlay's pixel size, to keep numbered badges from covering each other.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const el = overlay.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) =>
        prev && prev.width === r.width && prev.height === r.height
          ? prev
          : { width: r.width, height: r.height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Badge placement per box; a small box next to a distance line puts its badge off that line.
  const placements = useMemo(() => {
    if (!size) return {};
    const metrics = exportMetrics(0); // scale 1: the on-screen badge is 24 px
    const items = annotations.flatMap((a) =>
      a.status === "found" && a.box ? [{ id: a.id, box: a.box, kind: a.kind, axis: a.axis, value: a.value }] : [],
    );
    return placeBadges(items, size, metrics.badge, 20 * metrics.scale);
  }, [annotations, size]);

  const badgeOffsets = useMemo(() => {
    if (!size) return {};
    const metrics = exportMetrics(0);
    const points = annotations.flatMap((a) =>
      a.status === "found" && a.box
        ? [{ id: a.id, ...badgeCenter(pixelBox(a.box, size), placements[a.id] ?? badgePlacement(a.box, a.kind, a.axis, size.height / size.width), metrics, size) }]
        : [],
    );
    return separateBadges(points, metrics.badge, size.height);
  }, [annotations, size, placements]);

  function startDrag(
    e: PointerEvent<HTMLElement>,
    a: Annotation & { box: BoxPercent },
    mode: DragMode,
  ) {
    if (e.button !== 0) return;
    const rect = overlay.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    e.stopPropagation(); // the frame deselects on a press outside any box
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur(); // so Delete reaches the page, not a focused field
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(a.id);
    drag.current = {
      id: a.id,
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startBox: a.box,
      width: rect.width,
      height: rect.height,
    };
  }

  function moveDrag(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = ((e.clientX - d.startX) / d.width) * 100;
    const dy = ((e.clientY - d.startY) / d.height) * 100;
    onChangeBox(d.id, applyDrag(d.startBox, d.mode, dx, dy));
  }

  function endDrag(e: PointerEvent<HTMLElement>) {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  }

  return (
    <div ref={overlay} className={styles.overlay}>
      {annotations.map((a, index) => {
        if (a.status !== "found" || !a.box) return null;
        const found = a as Annotation & { box: BoxPercent };
        const selected = a.id === selectedId;
        const usual = badgePlacement(a.box, a.kind, a.axis, size ? size.height / size.width : undefined);
        const small = usual !== "corner";
        const placement = placements[a.id] ?? usual;
        const measure = a.kind === "measure" && a.axis ? a.axis : null;
        return (
          <div
            key={a.id}
            className={`${styles.box} ${measure ? styles.measure : ""} ${selected ? styles.selected : ""}`}
            data-annotation-id={a.id}
            style={{
              left: `${a.box.x}%`,
              top: `${a.box.y}%`,
              width: `${a.box.width}%`,
              height: `${a.box.height}%`,
            }}
            onPointerDown={(e) => startDrag(e, found, "move")}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {measure && (
              <>
                <span className={`${styles.line} ${styles[`${measure}Line`]}`} />
                <span className={`${styles.cap} ${styles[`${measure}Cap`]} ${styles.capStart}`} />
                <span className={`${styles.cap} ${styles[`${measure}Cap`]} ${styles.capEnd}`} />
                {a.value && (
                  <span className={`${styles.valueLabel} ${measure === "vertical" ? styles.valueLabelBeside : ""}`}>{a.value}</span>
                )}
              </>
            )}
            <span
              className={`${styles.badge} ${PLACEMENT_CLASS[placement]}`}
              style={{ "--badge-dy": `${badgeOffsets[a.id] ?? 0}px` } as CSSProperties}
            >
              {index + 1}
            </span>
            {selected &&
              handlesFor(placement, small).map((h) => (
                <span
                  key={h}
                  className={`${styles.handle} ${styles[`handle_${h}`]}`}
                  data-handle={h}
                  onPointerDown={(e) => startDrag(e, found, h)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
