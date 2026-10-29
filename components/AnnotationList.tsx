"use client";

import { useState } from "react";
import { capitalizeFirst } from "@/lib/format-label";
import type { Annotation, InvalidAnnotation } from "@/lib/types";
import styles from "./AnnotationList.module.css";

const STATUS_NOTE: Record<Annotation["status"], string | null> = {
  found: null,
  ambiguous: "Ambiguous target: no location drawn",
  not_found: "Target not found: no location drawn",
};

type Text = { label: string; description: string };

// Each entry can be edited in place (label and description). Clicking an entry
// that has a box selects that box on the image.
export function AnnotationList({
  annotations,
  invalid,
  selectedId,
  onSelect,
  onChangeText,
}: {
  annotations: Annotation[];
  invalid: InvalidAnnotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChangeText: (id: string, text: Text) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Text>({ label: "", description: "" });

  function startEdit(a: Annotation) {
    setEditingId(a.id);
    setDraft({ label: a.label, description: a.description });
  }

  function save() {
    if (editingId === null || draft.label.trim() === "") return;
    onChangeText(editingId, draft);
    setEditingId(null);
  }

  return (
    <>
      {annotations.length > 0 && (
        <ol className={styles.list}>
          {annotations.map((a) => {
            const note = STATUS_NOTE[a.status];
            const editing = a.id === editingId;
            const hasBox = a.status === "found" && a.box !== null;
            return (
              <li
                key={a.id}
                className={a.id === selectedId ? styles.selected : undefined}
                onClick={() => hasBox && !editing && onSelect(a.id)}
              >
                {editing ? (
                  <div
                    className={styles.editor}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  >
                    <input
                      aria-label="Label"
                      value={draft.label}
                      onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                      autoFocus
                    />
                    <textarea
                      aria-label="Description"
                      rows={2}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        className={styles.action}
                        onClick={save}
                        disabled={draft.label.trim() === ""}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={styles.action}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      {draft.label.trim() === "" && (
                        <span className={styles.note}>Label can&apos;t be empty.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <strong>{capitalizeFirst(a.label)}</strong>
                    {a.description && <>: {a.description}</>}{" "}
                    {a.kind === "measure" && (
                      <span className={styles.kind}>
                        {a.value ? `Distance ${a.value}` : "Distance"}
                      </span>
                    )}
                    <button
                      type="button"
                      className={styles.action}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(a);
                      }}
                    >
                      Edit
                    </button>
                    {note && <span className={styles.note}>{note}</span>}
                  </>
                )}
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
