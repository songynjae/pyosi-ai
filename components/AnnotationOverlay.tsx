import type { Annotation } from "@/lib/types";
import styles from "./AnnotationOverlay.module.css";

// Renders bounding boxes and numbered callouts over the screenshot.
// Positions are percentages, so the overlay scales with the image.
export function AnnotationOverlay({
  annotations,
}: {
  annotations: Annotation[];
}) {
  return (
    <div className={styles.overlay}>
      {annotations.map((a) => (
        <div
          key={a.id}
          className={styles.box}
          style={{
            left: `${a.box.x}%`,
            top: `${a.box.y}%`,
            width: `${a.box.width}%`,
            height: `${a.box.height}%`,
          }}
        >
          <span className={styles.badge}>{a.id}</span>
        </div>
      ))}
    </div>
  );
}
