"use client";

import { useEffect, useRef, useState } from "react";
import { AnnotationList } from "./AnnotationList";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { parseAnnotations } from "@/lib/annotation-schema";
import { removeAnnotation, setAnnotationBox, setAnnotationText } from "@/lib/box-edit";
import { MAX_NOTES_CHARS } from "@/lib/prompts/annotate";
import {
  EXPORT_FORMATS,
  exportFileName,
  renderExport,
  type ExportFormat,
} from "@/lib/export-image";
import { mapAnnotationsFromPadded } from "@/lib/pad-aspect";
import { loadPixels } from "@/lib/pixels";
import { refineAnnotations } from "@/lib/refine-gap";
import { prepareImage } from "@/lib/upscale";
import { pickDroppedFile, pickPastedImage } from "@/lib/dropped-file";
import { MAX_IMAGE_BYTES, validateImageFile } from "@/lib/image-validation";
import { ACCESS_HEADER } from "@/lib/access-header";
import { readAccessCode } from "@/lib/access-client";
import type { Annotation, BoxPercent, InvalidAnnotation } from "@/lib/types";
import styles from "./Workspace.module.css";

type ApiError = { error?: { message?: string } };

export function Workspace() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [invalid, setInvalid] = useState<InvalidAnnotation[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("annotated");
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<{ ok: boolean; text: string } | null>(null);
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

  // Export always draws from the original image, never the 2x copy sent to the model.
  async function exportBlob(): Promise<Blob> {
    if (!imageSrc) throw new Error("No image selected.");
    const blob = await renderExport(imageSrc, annotations, exportFormat);
    if (!blob) throw new Error("This image is too large to export.");
    return blob;
  }

  async function handleDownload() {
    setExporting(true);
    setExportNote(null);
    try {
      const blob = await exportBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(imageFile?.name ?? null, exportFormat);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setExportNote({ ok: false, text: err instanceof Error ? err.message : "Export failed." });
    } finally {
      setExporting(false);
    }
  }

  async function handleCopy() {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setExportNote({ ok: false, text: "Copying images isn't supported in this browser. Use Download PNG." });
      return;
    }
    setExporting(true);
    setExportNote(null);
    try {
      // Passing the promise keeps the click's permission while the image is drawn (Safari).
      await navigator.clipboard.write([new ClipboardItem({ "image/png": exportBlob() })]);
      setExportNote({ ok: true, text: "Copied to the clipboard." });
    } catch (err) {
      setExportNote({
        ok: false,
        text: err instanceof Error && err.message.includes("too large")
          ? err.message
          : "Couldn't copy the image. Use Download PNG instead.",
      });
    } finally {
      setExporting(false);
    }
  }

  function clearAnnotations() {
    requestId.current += 1;
    setSelectedId(null);
    setExportNote(null);
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
    setImageFile(file);
    setImageSrc(URL.createObjectURL(file));
    clearAnnotations();
  }

  useEffect(() => {
    handleFileRef.current = handleFile;
  });

  function resetImage() {
    if (fileInput.current) fileInput.current.value = "";
    setImageError(null);
    setNotes("");
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
      const file = imageFile;
      if (!file) throw new Error("No image selected.");

      // Small screenshots are sent at 2x, very wide and tall phone-shaped ones with white padding,
      // for more accurate boxes (lib/upscale.ts); padded boxes are mapped back below.
      const prepared = await prepareImage(file);
      const form = new FormData();
      form.set("image", prepared.file);
      form.set("notes", notes);
      const code = readAccessCode();
      const res = await fetch("/api/annotate", {
        method: "POST",
        body: form,
        headers: code ? { [ACCESS_HEADER]: code } : undefined,
      });
      const body = await res.json().catch(() => null);
      if (id !== requestId.current) return;
      if (!res.ok) {
        throw new Error((body as ApiError | null)?.error?.message ?? `Request failed (${res.status}).`);
      }
      // Re-validate on the client too; the route already validated.
      const returned = prepared.pad
        ? mapAnnotationsFromPadded(body?.annotations, prepared.pad)
        : body?.annotations;
      const parsed = parseAnnotations(returned);
      // Distance lines are snapped to the real edges in the original image (lib/refine-gap.ts).
      let shown = parsed.annotations;
      if (shown.some((a) => a.kind === "measure")) {
        const pixels = await loadPixels(file);
        if (id !== requestId.current) return;
        if (pixels) shown = refineAnnotations(shown, pixels);
      }
      setAnnotations(shown);
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
        <h1>
          <svg className={styles.logo} viewBox="0 0 32 32" aria-hidden="true">
            <rect className={styles.logoBox} x="2" y="4" width="26" height="24" rx="6" />
            <text className={styles.logoLetter} x="15" y="23" textAnchor="middle">
              P
            </text>
            <circle className={styles.logoDot} cx="27" cy="6" r="5" />
          </svg>
          Pyosi
        </h1>
        <p>
          Pyosi finds the part of a screenshot you&apos;re talking about, and marks it.
        </p>
        <ol className={styles.steps}>
          <li>Add a screenshot</li>
          <li>Write rough notes</li>
          <li>Generate, then edit</li>
          <li>Export a PNG</li>
        </ol>
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
              <svg className={styles.dropIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M12 4v11M7.5 8.5 12 4l4.5 4.5" />
              </svg>
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
              <p className={styles.hint}>PNG or JPEG, up to {MAX_IMAGE_BYTES / (1024 * 1024)} MB.</p>
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

          {imageSrc && annotations.length > 0 && (
            <section className={styles.exportSection} aria-label="Export">
              <h3 className={styles.exportHeading}>Export</h3>
              <div className={styles.exportBar}>
                <select
                  aria-label="Export format"
                  value={exportFormat}
                  onChange={(e) => {
                    setExportFormat(e.target.value as ExportFormat);
                    setExportNote(null);
                  }}
                >
                  {EXPORT_FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={handleDownload}
                  disabled={exporting}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={handleCopy}
                  disabled={exporting}
                >
                  Copy
                </button>
              </div>
              {exportNote && (
                <p
                  className={exportNote.ok ? styles.exportOk : styles.error}
                  role={exportNote.ok ? "status" : "alert"}
                >
                  {exportNote.text}
                </p>
              )}
            </section>
          )}
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
          <p className={styles.generateHint}>
            Your screenshot and notes are sent to Meta&apos;s Muse Spark model API to generate the annotations. Pyosi does not store them. Please don&apos;t upload confidential screenshots.
          </p>
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
