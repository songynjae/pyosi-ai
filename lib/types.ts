/** Bounding box in percent (0-100) of the screenshot's width/height. */
export type Annotation = {
  id: number;
  label: string;
  description: string;
  box: { x: number; y: number; width: number; height: number };
};
