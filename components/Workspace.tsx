"use client";

import { useEffect, useRef, useState } from "react";
import { AnnotationList } from "./AnnotationList";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { parseAnnotations } from "@/lib/annotation-schema";
import { removeAnnotation, setAnnotationBox, setAnnotationText } from "@/lib/box-edit";
import { MAX_NOTES_CHARS } from "@/lib/prompts/annotate";
import { upscaleImage } from "@/lib/upscale";
import { pickDroppedFile, pickPastedImage } from "@/lib/dropped-file";
import { validateImageFile } from "@/lib/image-validation";
import { FLORADAY_IMAGE } from "@/lib/fixtures/floraday";
import type { Annotation, BoxPercent, InvalidAnnotation } from "@/lib/types";
import styles from "./Workspace.module.css";

// Built-in sample (a dev/test asset). It goes through the same model call as an upload.
const SAMPLES = {
  floraday: {
    label: "or use the Floraday sample",
    src: FLORADAY_IMAGE.src,
  },
};
type SampleId = keyof typeof SAMPLES;

type ApiError = { error?: { message?: string } };

export function Workspace() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [sampleId, setSampleId] = useState<SampleId | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [invalid, setInvalid] = useState<InvalidAnnotation[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Bumped on every new image and request so a late response is ignored.
  const requestId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  // Latest handler for the window-level drop and paste listeners below.
  const handleFileRef = useRef<(file: File | undefined) => void>(() => {});

  // Free the object URL created for an uploaded file.
  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // Drop an image anywhere on the page, or paste one (e.g. a screenshot copied
  // to the clipboard). Text pastes into the notes box are left alone.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // otherwise the browser opens the file
      depth = 0;
      setDragging(false);
      handleFileRef.current(pickDroppedFile(e.dataTransfer?.files));
    };
    const onPaste = (e: ClipboardEvent) => {
      const file = pickPastedImage(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      handleFileRef.current(file);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  // Selection only counts while the annotation still exists and has a box.
  const selected =
    annotations.find((a) => a.id === selectedId && a.status === "found" && a.box) ?? null;
  const hasBoxes = annotations.some((a) => a.status === "found" && a.box);

  function deleteSelected() {
    if (!selected) return;
    setAnnotations((prev) => removeAnnotation(prev, selected.id));
    setSelectedId(null);
  }
  // Latest handler for the window-level key listener below.
  const deleteSelectedRef = useRef(deleteSelected);
  useEffect(() => {
    deleteSelectedRef.current = deleteSelected;
  });

  // Delete / Backspace removes the selected box, except while typing in a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      deleteSelectedRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function changeBox(id: string, box: BoxPercent) {
    setAnnotations((prev) => setAnnotationBox(prev, id, box));
  }

  function changeText(id: string, text: { label: string; description: string }) {
    setAnnotations((prev) => setAnnotationText(prev, id, text));
  }

  function clearAnnotations() {
    requestId.current += 1;
    setSelectedId(null);
    setLoading(false);
    setGenerateError(null);
    setAnnotations([]);
    setInvalid([]);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.ok) {
      setImageError(check.message);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setImageError(null);
    if (imageSrc) setNotes(""); // replacing an image: the old notes no longer fit
    setSampleId(null);
    setImageFile(file);
    setImageSrc(URL.createObjectURL(file));
    clearAnnotations();
  }

  function selectSample(id: SampleId) {
    if (fileInput.current) fileInput.current.value = "";
    setImageError(null);
    if (imageSrc) setNotes("");
    setSampleId(id);
    setImageFile(null);
    setImageSrc(SAMPLES[id].src);
    clearAnnotations();
  }

  useEffect(() => {
    handleFileRef.current = handleFile;
  });

  function resetImage() {
    if (fileInput.current) fileInput.current.value = "";
    setImageError(null);
    setNotes("");
    setSampleId(null);
    setImageFile(null);
    setImageSrc(null);
    clearAnnotations();
  }

  async function handleGenerate() {
    if (!imageSrc) return;
    const id = ++requestId.current;
    setLoading(true);
    setGenerateError(null);
    setSelectedId(null);
    setAnnotations([]);
    setInvalid([]);
    try {
      let file = imageFile;
      if (!file && sampleId) {
        const blob = await (await fetch(SAMPLES[sampleId].src)).blob();
        file = new File([blob], "sample.png", { type: blob.type });
      }
      if (!file) throw new Error("No image selected.");

      // Small screenshots are sent at 2x for more accurate boxes (lib/upscale.ts).
      const form = new FormData();
      form.set("image", await upscaleImage(file));
      form.set("notes", notes);
      const res = await fetch("/api/annotate", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (id !== requestId.current) return;
      if (!res.ok) {
        throw new Error((body as ApiError | null)?.error?.message ?? `Request failed (${res.status}).`);
      }
      // Re-validate on the client too; the route already validated.
      const parsed = parseAnnotations(body?.annotations);
      setAnnotations(parsed.annotations);
      setInvalid([...(body?.invalid ?? []), ...parsed.invalid]);
    } catch (err) {
      if (id !== requestId.current) return;
      setGenerateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Pyosi</h1>
        <p>
          Turn screenshots and rough notes into clear visual explanations.
        </p>
      </header>

      <div className={styles.grid}>
        {/* First in the DOM so it comes first on narrow screens; the grid puts it on the right. */}
        <section
          className={`${styles.panel} ${styles.screenshotPanel} ${dragging ? styles.dragging : ""}`}
          aria-label="Screenshot"
        >
          <div className={styles.previewHeader}>
            <h2>Screenshot</h2>
            {imageSrc && (
              <button type="button" className={styles.link} onClick={resetImage}>
                New image
              </button>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // lets the same file be chosen again
              handleFile(file);
            }}
          />

          {imageError && (
            <p className={styles.error} role="alert">
              {imageError}
            </p>
          )}

          {imageSrc ? (
            <div className={styles.frame} onPointerDown={() => setSelectedId(null)}>
              {/* Plain <img>: the source is a local blob URL, which next/image can't optimize. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt="Uploaded screenshot" />
              <AnnotationOverlay
                annotations={annotations}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
                onChangeBox={changeBox}
              />
              {dragging && (
                <div className={styles.dropOverlay}>Drop to replace the image.</div>
              )}
            </div>
          ) : (
            <div className={styles.dropzone}>
              <p className={styles.dropTitle}>
                {dragging
                  ? "Drop the image here."
                  : "Drop or paste (⌘V / Ctrl+V) a screenshot here"}
              </p>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => fileInput.current?.click()}
              >
                Choose file
              </button>
              <p className={styles.hint}>PNG or JPEG, up to 10 MB.</p>
              {(Object.keys(SAMPLES) as SampleId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.link}
                  onClick={() => selectSample(id)}
                >
                  {SAMPLES[id].label}
                </button>
              ))}
            </div>
          )}

          {imageSrc && hasBoxes && (
            <div className={styles.editBar}>
              <span>
                {selected
                  ? "Drag to move, drag a handle to resize."
                  : "Click a box to move, resize or delete it."}
              </span>
              {selected && (
                <button type="button" className={styles.link} onClick={deleteSelected}>
                  Delete annotation
                </button>
              )}
            </div>
          )}

          {(annotations.length > 0 || invalid.length > 0) && (
            <h3 className={styles.listHeading}>Annotations</h3>
          )}
          <AnnotationList
            annotations={annotations}
            invalid={invalid}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            onChangeText={changeText}
          />
        </section>

        <section className={`${styles.panel} ${styles.notesPanel}`} aria-label="Notes">
          <label className={styles.field}>
            <span>Rough notes</span>
            <textarea
              rows={7}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={MAX_NOTES_CHARS}
              placeholder="e.g. orders API times out after 30s, retry doesn't help"
            />
          </label>

          <button
            type="button"
            className={styles.primary}
            onClick={handleGenerate}
            disabled={!imageSrc || notes.trim() === "" || loading}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          {!imageSrc ? (
            <p className={styles.generateHint}>Add a screenshot to enable Generate.</p>
          ) : (
            notes.trim() === "" && (
              <p className={styles.generateHint}>Add some notes to enable Generate.</p>
            )
          )}
          {generateError && (
            <p className={styles.error} role="alert">
              {generateError}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
