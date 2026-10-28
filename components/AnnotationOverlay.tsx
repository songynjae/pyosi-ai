import { badgePlacement } from "@/lib/badge-placement";
import type { Annotation } from "@/lib/types";
import styles from "./AnnotationOverlay.module.css";

// Renders bounding boxes and numbered callouts over the screenshot.
// Positions are percentages, so the overlay scales with the image.
// The number is the entry's position in `annotations` (same as the list), so
// annotations without a location leave a gap instead of shifting the rest.
// Small boxes get their badge above (or below, near the top edge) so it does
// not cover the target.
const PLACEMENT_CLASS = {
  corner: "",
  above: styles.badgeAbove,
  below: styles.badgeBelow,
};

export function AnnotationOverlay({
  annotations,
}: {
  annotations: Annotation[];
}) {
  return (
    <div className={styles.overlay}>
      {annotations.map((a, index) =>
        a.status === "found" && a.box ? (
          <div
            key={a.id}
            className={styles.box}
            data-annotation-id={a.id}
            style={{
              left: `${a.box.x}%`,
              top: `${a.box.y}%`,
              width: `${a.box.width}%`,
              height: `${a.box.height}%`,
            }}
          >
            <span
              className={`${styles.badge} ${PLACEMENT_CLASS[badgePlacement(a.box)]}`}
            >
              {index + 1}
            </span>
          </div>
        ) : null,
      )}
    </div>
  );
}
