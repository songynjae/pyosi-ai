import type { Annotation, InvalidAnnotation } from "@/lib/types";
import styles from "./AnnotationList.module.css";

const STATUS_NOTE: Record<Annotation["status"], string | null> = {
  found: null,
  ambiguous: "Ambiguous target: no location drawn",
  not_found: "Target not found: no location drawn",
};

export function AnnotationList({
  annotations,
  invalid,
}: {
  annotations: Annotation[];
  invalid: InvalidAnnotation[];
}) {
  return (
    <>
      {annotations.length > 0 && (
        <ol className={styles.list}>
          {annotations.map((a) => {
            const note = STATUS_NOTE[a.status];
            return (
              <li key={a.id}>
                <strong>{a.label}</strong>: {a.description}
                {note && <span className={styles.note}>{note}</span>}
              </li>
            );
          })}
        </ol>
      )}

      {invalid.length > 0 && (
        <div className={styles.invalid} role="alert">
          <p>
            {invalid.length} invalid annotation{invalid.length > 1 ? "s were" : " was"}{" "}
            skipped. The rest are shown above.
          </p>
          <ul>
            {invalid.map((item, i) => (
              <li key={`${item.index}-${i}`}>
                {item.index === null ? "Response" : `Entry ${item.index + 1}`}
                {item.id ? ` (${item.id})` : ""}: {item.issues.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
