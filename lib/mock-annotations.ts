import type { Annotation } from "./types";

// MOCK DATA: hand-written annotations for /sample-screenshot.svg.
// Replaced by model output once the AI integration lands.
export const MOCK_ANNOTATIONS: Annotation[] = [
  {
    id: "error-banner",
    label: "Error banner",
    description: "The API returned 500 on /api/orders. This is the symptom.",
    status: "found",
    box: { x: 4, y: 18, width: 92, height: 14 },
  },
  {
    id: "failing-request",
    label: "Failing request",
    description: "POST /api/orders fails after 30s, which points to a timeout.",
    status: "found",
    box: { x: 4, y: 40, width: 56, height: 14 },
  },
  {
    id: "retry-button",
    label: "Retry button",
    description: "Retrying hits the same timeout, so it will not help.",
    status: "found",
    box: { x: 68, y: 40, width: 24, height: 14 },
  },
  {
    id: "success-toast",
    label: "Success message",
    description:
      "No success or confirmation message is visible, so there is nothing to point at.",
    status: "not_found",
    box: null,
  },
];
