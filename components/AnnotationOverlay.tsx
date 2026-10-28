import type { Annotation } from "@/lib/types";
import styles from "./AnnotationOverlay.module.css";

// Renders bounding boxes and numbered callouts over the screenshot.
// Positions are percentages, so the overlay scales with the image.
// The number is the entry's position in `annotations` (same as the list), so
// annotations without a location leave a gap instead of shifting the rest.
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
            <span className={styles.badge}>{index + 1}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}
