"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";
import { badgePlacement } from "@/lib/badge-placement";
import { applyDrag, type DragMode, type ResizeHandle } from "@/lib/box-edit";
import type { Annotation, BoxPercent } from "@/lib/types";
import styles from "./AnnotationOverlay.module.css";

// Renders bounding boxes and numbered callouts over the screenshot.
// Positions are percentages, so the overlay scales with the image.
// The number is the entry's position in `annotations` (same as the list), so
// annotations without a location leave a gap instead of shifting the rest.
// Small boxes get their badge above (or below, near the top edge) so it does
// not cover the target.
// Boxes can be selected, moved and resized with pointer events (mouse, touch
// and pen share one path); the drag math lives in lib/box-edit.ts.
const PLACEMENT_CLASS = {
  corner: "",
  above: styles.badgeAbove,
  below: styles.badgeBelow,
};

// Normal boxes have their badge on the top-left corner, so they get no "nw"
// handle (it would hide the number); that corner is reached with "n" then "w".
const ALL_HANDLES: ResizeHandle[] = ["n", "ne", "e", "se", "s", "sw", "w"];
const CORNER_HANDLES: ResizeHandle[] = ["nw", "ne", "se", "sw"];

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
        const placement = badgePlacement(a.box);
        return (
          <div
            key={a.id}
            className={`${styles.box} ${selected ? styles.selected : ""}`}
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
            <span className={`${styles.badge} ${PLACEMENT_CLASS[placement]}`}>
              {index + 1}
            </span>
            {selected &&
              (placement === "corner" ? ALL_HANDLES : CORNER_HANDLES).map((h) => (
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
