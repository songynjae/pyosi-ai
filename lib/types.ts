export type AnnotationStatus = "found" | "ambiguous" | "not_found";

/** Bounding box in percent (0-100) of the screenshot's width/height. Top-left origin. */
export type BoxPercent = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** "box" highlights an area. "measure" draws a distance line (a gap between elements, or one element's width/height). */
export type AnnotationKind = "box" | "measure";

/** Direction of a distance line: "horizontal" measures left-right, "vertical" top-bottom. */
export type MeasureAxis = "horizontal" | "vertical";

export type Annotation = {
  /** Stable identifier. The on-screen number comes from array order, not from this. */
  id: string;
  label: string;
  description: string;
  status: AnnotationStatus;
  /** Required when status is "found", must be null otherwise. */
  box: BoxPercent | null;
  /** Omitted means "box". For "measure" the box is the measured span: its width (horizontal) or height (vertical) is the distance. */
  kind?: AnnotationKind;
  /** Required for "measure", absent otherwise. */
  axis?: MeasureAxis;
  /** The value the notes give for a "measure" (e.g. "8mm"), as written. */
  value?: string;
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
