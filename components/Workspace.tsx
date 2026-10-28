"use client";

import { useEffect, useRef, useState } from "react";
import { AnnotationList } from "./AnnotationList";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { parseAnnotations } from "@/lib/annotation-schema";
import { validateImageFile } from "@/lib/image-validation";
import { FLORADAY_ANNOTATIONS, FLORADAY_IMAGE } from "@/lib/fixtures/floraday";
import { MOCK_ANNOTATIONS } from "@/lib/mock-annotations";
import type { Annotation, InvalidAnnotation } from "@/lib/types";
import styles from "./Workspace.module.css";

// MOCK: each built-in sample ships with hard-coded annotations.
const SAMPLES = {
  orders: {
    label: "or use a sample screenshot",
    src: "/sample-screenshot.svg",
    annotations: MOCK_ANNOTATIONS,
  },
  floraday: {
    label: "or use the Floraday fixture",
    src: FLORADAY_IMAGE.src,
    annotations: FLORADAY_ANNOTATIONS,
  },
};
type SampleId = keyof typeof SAMPLES;

export function Workspace() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [sampleId, setSampleId] = useState<SampleId | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [invalid, setInvalid] = useState<InvalidAnnotation[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Free the object URL created for an uploaded file.
  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  function clearAnnotations() {
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
    setImageSrc(URL.createObjectURL(file));
    clearAnnotations();
  }

  function selectSample(id: SampleId) {
    if (fileInput.current) fileInput.current.value = "";
    setImageError(null);
    setSampleId(id);
    setImageSrc(SAMPLES[id].src);
    clearAnnotations();
  }

  // MOCK: no AI call yet. Shows hard-coded annotations regardless of the notes
  // (the Orders sample's data for uploads). They go through the same
  // validation that model output will.
  function handleGenerate() {
    const raw = sampleId ? SAMPLES[sampleId].annotations : MOCK_ANNOTATIONS;
    const parsed = parseAnnotations(raw);
    setAnnotations(parsed.annotations);
    setInvalid(parsed.invalid);
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
              placeholder="e.g. orders API times out after 30s, retry doesn't help"
            />
          </label>

          <button
            type="button"
            className={styles.primary}
            onClick={handleGenerate}
            disabled={!imageSrc}
          >
            Generate
          </button>
          <p className={styles.mockNote}>
            Mock mode: annotations are hard-coded sample data or a manually
            defined fixture. No AI is called yet.
          </p>
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
