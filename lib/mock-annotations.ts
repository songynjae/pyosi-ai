import type { Annotation } from "./types";

// MOCK DATA: hand-written annotations for /sample-screenshot.svg.
// Replaced by model output once the AI integration lands.
export const MOCK_ANNOTATIONS: Annotation[] = [
  {
    id: 1,
    label: "Error banner",
    description: "The API returned 500 on /api/orders. This is the symptom.",
    box: { x: 4, y: 18, width: 92, height: 14 },
  },
  {
    id: 2,
    label: "Failing request",
    description: "POST /api/orders fails after 30s, which points to a timeout.",
    box: { x: 4, y: 40, width: 56, height: 14 },
  },
  {
    id: 3,
    label: "Retry button",
    description: "Retrying hits the same timeout, so it will not help.",
    box: { x: 68, y: 40, width: 24, height: 14 },
  },
];
