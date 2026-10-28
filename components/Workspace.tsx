"use client";

import { useEffect, useRef, useState } from "react";
import { AnnotationList } from "./AnnotationList";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { parseAnnotations } from "@/lib/annotation-schema";
import { MAX_NOTES_CHARS } from "@/lib/prompts/annotate";
import { upscaleImage } from "@/lib/upscale";
import { validateImageFile } from "@/lib/image-validation";
import { FLORADAY_IMAGE } from "@/lib/fixtures/floraday";
import type { Annotation, InvalidAnnotation } from "@/lib/types";
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
  // Bumped on every new image and request so a late response is ignored.
  const requestId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  // Free the object URL created for an uploaded file.
  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  function clearAnnotations() {
    requestId.current += 1;
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
    setSampleId(null);
    setImageFile(file);
    setImageSrc(URL.createObjectURL(file));
    clearAnnotations();
  }

  function selectSample(id: SampleId) {
    if (fileInput.current) fileInput.current.value = "";
    setImageError(null);
    setSampleId(id);
    setImageFile(null);
    setImageSrc(SAMPLES[id].src);
    clearAnnotations();
  }

  async function handleGenerate() {
    if (!imageSrc) return;
    const id = ++requestId.current;
    setLoading(true);
    setGenerateError(null);
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
        <section className={styles.panel} aria-label="Input">
          <label className={styles.field}>
            <span>Screenshot</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          <p className={styles.hint}>PNG or JPEG, up to 10 MB.</p>
          {imageError && (
            <p className={styles.error} role="alert">
              {imageError}
            </p>
          )}
          <div className={styles.samples}>
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
          {imageSrc && notes.trim() === "" && (
            <p className={styles.hint}>Add some notes to enable Generate.</p>
          )}
          {generateError && (
            <p className={styles.error} role="alert">
              {generateError}
            </p>
          )}
        </section>

        <section className={styles.panel} aria-label="Preview">
          <h2>Preview</h2>
          {imageSrc ? (
            <div className={styles.frame}>
              {/* Plain <img>: the source is a local blob URL, which next/image can't optimize. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt="Uploaded screenshot" />
              <AnnotationOverlay annotations={annotations} />
            </div>
          ) : (
            <div className={styles.empty}>
              Upload a screenshot to see the preview.
            </div>
          )}

          <AnnotationList annotations={annotations} invalid={invalid} />
        </section>
      </div>
    </main>
  );
}
