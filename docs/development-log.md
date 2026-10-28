# Development Log

Newest entries first.

## 2026-10-27: Milestone 2.1, annotation schema and validation (complete)
**Status: complete** (committed on `feat/annotation-schema-m2-1`, not yet merged). Prepares the data model for AI output. No model or provider is integrated; everything is still mock/manual data.

- `Annotation` now has a stable string `id`, a per-annotation `status` (`found | ambiguous | not_found`) and a nullable `box` (`lib/types.ts`).
- Zod validation in `lib/annotation-schema.ts`: coordinates within 0-100, `width/height > 0`, `x + width <= 100`, `y + height <= 100`, finite numbers; `found` requires a box; `ambiguous`/`not_found` must have `box: null`; ids must be unique.
- `parseAnnotations()` validates entry by entry. Valid entries are kept in order; invalid ones are returned separately in `invalid` (index, id, issues). Nothing is clamped or repaired, and an invalid entry is never turned into `not_found`.
- Display numbers come from array order (list position), not from `id`. Annotations without a location keep their number in the list and leave a gap in the badges on the image.
- The overlay draws only `found` annotations with a box. The list shows every valid annotation, adds a note for `ambiguous`/`not_found`, and shows invalid entries in a separate warning block.
- Upload accepts PNG/JPEG up to 10 MB with specific messages (`lib/image-validation.ts`). This checks the browser-reported MIME type and size only.
- Floraday fixture (`lib/fixtures/floraday.ts`, image in `public/fixtures/floraday.png`): "Lily card" and "Choose Another Sky button" use the human-measured pixel boxes from ContextMark test case 2, converted to percentages; "Refresh button" is `not_found` (no such control is visible in the screenshot).
- Tests: `npm test` (Node's built-in runner, no extra dependency), 32 tests for box validation, status/box consistency, partial success, upload validation and the fixtures.

### Verified
- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- In the browser (dev server): the Floraday fixture boxes line up with the card and button at 5 viewport widths (image width 299-660 px); measured offset from the expected position is at most 0.01 px.
- Partial success in the UI: with two invalid entries temporarily injected into the mock data, the valid annotations (including a `not_found` one) still rendered and the invalid ones were listed separately. The injection was reverted.
- Upload rejection messages for GIF, 11 MB PNG and an empty file; a valid 1.9 MB PNG loads.

### Remaining issues / decisions
- Upload validation is client-side and trusts the MIME type. The future API route must re-check file contents (magic bytes) and size.
- The Floraday fixture boxes come from ContextMark's single-annotator ground truth; the "Lily card" box is the whole card, which that project already noted as a judgment call.
- Uploaded images still show the Orders sample's mock annotations, which will not line up with them (existing mock behaviour).
- Model output coordinate format (pixels vs percent) and the prompts are still undecided. Prompts will live in their own version-controlled files once written.
- Cleanup before submission: when the Meta API is integrated, remove the mock branch in `handleGenerate`, the Orders sample (`public/sample-screenshot.svg`, `lib/mock-annotations.ts`, its test line) and the "Mock mode" notice. Decide whether the Floraday fixture stays as a dev/test asset or is removed from the UI, and confirm the screenshot is OK to publish before making the repo public.
- `ambiguous`/`not_found` with a box is treated as invalid (strict), unlike ContextMark which ignored the boxes with a warning.

## 2026-10-27: Initial setup
- Created the repository and the Next.js app (App Router, TypeScript, React, npm).
- Built a single-page UI: screenshot upload, rough-notes textarea, Generate button, preview area.
- Added **mock** annotation data (`lib/mock-annotations.ts`) rendered as numbered callouts and bounding boxes over the screenshot. Positions are stored as percentages so they scale with the image.
- Added a sample screenshot (`public/sample-screenshot.svg`) so the mock flow can be tried without uploading a file.
- No AI integration, annotation editing or export yet.

### Decisions
- No Tailwind or UI library: plain CSS modules keep dependencies minimal.
- Annotation boxes use percent coordinates, which keeps the overlay independent of image resolution.
