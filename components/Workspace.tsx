"use client";

import { useEffect, useState } from "react";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { MOCK_ANNOTATIONS } from "@/lib/mock-annotations";
import type { Annotation } from "@/lib/types";
import styles from "./Workspace.module.css";

const SAMPLE_SRC = "/sample-screenshot.svg";

export function Workspace() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Free the object URL created for an uploaded file.
  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setImageSrc(URL.createObjectURL(file));
    setAnnotations([]);
  }

  function useSample() {
    setImageSrc(SAMPLE_SRC);
    setAnnotations([]);
  }

  // MOCK: no AI call yet. Shows hard-coded annotations regardless of the notes.
  function handleGenerate() {
    setAnnotations(MOCK_ANNOTATIONS);
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
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          <button type="button" className={styles.link} onClick={useSample}>
            or use a sample screenshot
          </button>

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
            Mock mode: annotations below are hard-coded sample data. No AI is
            called yet.
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

          {annotations.length > 0 && (
            <ol className={styles.list}>
              {annotations.map((a) => (
                <li key={a.id}>
                  <strong>{a.label}</strong>: {a.description}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
