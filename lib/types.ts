export type AnnotationStatus = "found" | "ambiguous" | "not_found";

/** Bounding box in percent (0-100) of the screenshot's width/height. Top-left origin. */
export type BoxPercent = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Annotation = {
  /** Stable identifier. The on-screen number comes from array order, not from this. */
  id: string;
  label: string;
  description: string;
  status: AnnotationStatus;
  /** Required when status is "found", must be null otherwise. */
  box: BoxPercent | null;
};

/** An entry that failed validation. Distinct from a valid annotation with status "not_found". */
export type InvalidAnnotation = {
  /** Zero-based position in the input array, or null when the input was not an array. */
  index: number | null;
  id: string | null;
  issues: string[];
};

export type ParsedAnnotations = {
  annotations: Annotation[];
  invalid: InvalidAnnotation[];
};
