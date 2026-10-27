# Development Log

Newest entries first.

## 2026-10-27: Initial setup
- Created the repository and the Next.js app (App Router, TypeScript, React, npm).
- Built a single-page UI: screenshot upload, rough-notes textarea, Generate button, preview area.
- Added **mock** annotation data (`lib/mock-annotations.ts`) rendered as numbered callouts and bounding boxes over the screenshot. Positions are stored as percentages so they scale with the image.
- Added a sample screenshot (`public/sample-screenshot.svg`) so the mock flow can be tried without uploading a file.
- No AI integration, annotation editing or export yet.

### Decisions
- No Tailwind or UI library: plain CSS modules keep dependencies minimal.
- Annotation boxes use percent coordinates, which keeps the overlay independent of image resolution.
