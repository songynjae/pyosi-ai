# Development Log

Newest entries first.

## 2026-10-27: Milestone 2.2-C, AI annotation route and UI wiring (implemented; live accuracy issue open)
**Status: implemented and live-tested with 8 requests; NOT committed yet, pending a decision on small-image handling (see the investigation).**

- `POST /api/annotate` (`app/api/annotate/route.ts` -> `lib/annotate-handler.ts`): multipart `image` + `notes`. Checks size, magic bytes (PNG/JPEG) and notes (1-4000 chars) before any model call; 503 if `MODEL_API_KEY` is missing. The key is read only in the route.
- `lib/meta-client.ts`: one request to `muse-spark-1.3` (standard mode), `reasoning_effort: "minimal"`, no retries, 60 s timeout, upstream error bodies are not forwarded.
- `lib/prompts/annotate.ts`: versioned prompt (currently `annotate.v3`) and JSON schema. Notes are fenced as data.
- `lib/grounding.ts` / `lib/model-output.ts`: 0-1000 grid to percent boxes, ids assigned (`ann-1`...), then `parseAnnotations()`. No clamping.
- UI: Generate calls the route (loading state, error alert, requires non-empty notes, stale responses ignored). Mock branch, Orders sample, `lib/mock-annotations.ts`, the "Mock mode" notice and their test were removed; the Floraday sample stays as a dev asset.
- Tests: 41 pass (`npm test`), plus `tsc`, `lint`, `build`.

### Live results (4 requests, about $0.02 total, 1.7-3.5 s each)
| Image | Notes | Result |
|---|---|---|
| Floraday (2048x1124) | 3 elements incl. a missing Refresh button | 3 entries, Refresh `not_found`; boxes line up (button within 0.5% of ground truth). |
| Floraday, same request again | same | 4 entries (it added "Lily card text area"): output varies between runs, boxes still correct. |
| Pyosi desktop screenshot (800x600 JPEG) | 3 elements incl. a missing Cancel button | `not_found` correct, but the two found boxes are shifted up by about 5% of the image height (Generate button y 56.6-62.4% vs about 61-67% actual; notes box likewise). x and size are right. |
| Pyosi mobile screenshot (750x1624 JPEG) | 4 elements | all 5 boxes within about 1% of the real elements. |

### Investigation of the 800x600 box offset (4 more requests, about $0.015)
Same notes each time, on this app's own UI. Truth (measured from the screenshot): Generate button y 61.3-67.2%, notes box y 38.3-59.7%.

| Variant | Image tokens (prompt) | Generate button y | Notes box y |
|---|---|---|---|
| Original, dark 800x600 JPEG | 865 | 56.6-62.4 (about 5% high) | 33.4-55.3 (about 5% high) |
| Same file, repeated | 865 | 61.2-65.4 (bottom 2% short) | 28.6-59.4 (top 10% high) |
| Light-mode 800x600 JPEG | 865 | 61.1-67.1 (correct) | 33.2-60.5 (top 5% high, may include the label) |
| Same content upscaled 2x to 1600x1200 PNG | 2,728 | 61.2-67.1 (correct) | 38.2-59.7 (correct) |
| Same 2x PNG, repeated | 2,728 | 61.2-67.1 (identical) | 38.2-59.8 (identical) |

- The error is not a fixed offset: the identical 800x600 file gave different boxes on two runs. At 800x600 the boxes are noisy (up to about 10% on an edge).
- Upscaling the same pixels to 1600x1200 gave correct, repeatable boxes twice. Larger inputs (Floraday 2048 wide, mobile 750x1624) were also accurate, so the likely factor is how many image tokens the model gets, not aspect ratio or dark mode.
- Evidence is small (n=2 per condition, one UI). The upscale effect is a hypothesis to confirm on more screenshots.
- Proposed remedy (not implemented, needs approval): upscale images whose long side is under about 1400 px to about 1600 px before sending. Boxes are percentages, so the overlay is unaffected.

### Prompt v2: description wording (user-reported)
- User testing on a Google search page showed descriptions like "Left banner below the search bar ... that the notes say seems larger than expected." The v1 prompt told the model to explain "what the notes say about it", so it quoted the notes.
- v2 asks for a short direct restatement of the note's point ("This banner is larger than expected."), no "the notes say", no invented causes. Structure and route are unchanged.
- Live check (2 requests, about $0.01): Floraday notes now give "This is the Lily flower photo at the top of the card. It appears too large compared to the text below it." and "Its light outline and grey text make it easy to miss." No "the notes say". Terse notes with a mismatching screenshot gave `not_found` with "There is no search bar or banners below it visible in this view." Small sample; the Floraday run added an extra "Lily card text area" entry the notes did not ask for (non-deterministic scope).
- Small-image upscaling was deferred by the user for now.

### Audit of a user test: tiny target on the Google search page (3 requests, about $0.015)
Screenshot 1668x678 px, notes "We need to revise an icon in a Create images card". Measured truth: banana icon about [52.7, 79.4, 54.4, 84.4] % (1.7% wide, 5% high), Create images card [50.7, 73.5, 79.4, 89.8] %.

| Run | Icon box (x1,y1,x2,y2 %) | Icon IoU | Card IoU | Description |
|---|---|---|---|---|
| Original | 52.5, 80.1, 54.7, 85.2 | 0.59 | - | "...needs to be revised." |
| Original, repeated | 52.3, 78.0, 54.8, 83.2 | 0.45 | 0.78 | "...needs to be revised." (also added a card entry) |
| 2x upscaled (3336x1356) | 52.5, 79.3, 54.6, 84.3 | 0.81 | 0.97 | "...needs to be revised." |

- The user's own UI run showed a box about one icon-height above the icon and a description without "needs to be revised". Neither reproduced in these 3 requests, so that run was an outlier: output varies between runs of the same input.
- Tiny targets (under about 2% of the width) are noisy even at 1668 px; the 2x copy was the most accurate once (n=1). Together with the 800x600 results above, this supports upscaling small images, but evidence is still small.
- UI issue: the 24 px numbered badge sits on the box corner and covers a tiny target.
- Description rule: v2's "if the notes only name the element, say what it is" can drop an action in the note. 3/3 of these runs kept it, the user's run did not.

### Fixes after the Google audit (user-approved: description wording and badge placement; upscaling left out)
- Prompt `annotate.v3`: a requested change or complaint in the notes is always kept in the description ("This icon needs to be revised."); naming the element is only the fallback. Not yet re-tested against the live API with more than the 3 audit runs.
- Badge placement (`lib/badge-placement.ts`, `components/AnnotationOverlay.tsx`): a box under 6% wide or high gets its numbered badge centered above it (below it when the box is within 8% of the top edge) so the badge does not cover the target. Normal boxes keep the corner badge. Unit-tested (3 tests, 44 total); checked visually in the browser with a stubbed API response: normal box (corner), tiny icon (above), small box near the top (below).
- One unplanned live request (about $0.005) was sent during the visual check: the response stub was installed in the wrong browser tab, so Generate hit the real API once. It returned a harmless `not_found`. The check was redone with the stub in the right tab (0 real calls).
- Small-image upscaling was later implemented (see below).

### Coordinate format A/B: normalized 0-1000 grid vs pixels (3 requests, about $0.008)
M2.1 left "pixels vs percent" open until the API was attached. The app uses the 0-1000 normalized grid (converted to percent); this compared it with asking for pixel boxes (the prompt states the image size). IoU against hand-measured pixel truth, measured in pixels:

| Screenshot | Normalized 0-1000 | Pixels |
|---|---|---|
| Google 1668x678, "Create images" icon | 0.59, 0.45 (2 runs) | 0.52 |
| Cursor 778x580, voice icon | 0.26 (also 0.19 in the user's UI run) | 0.33 |

- No clear accuracy difference. On the Cursor image both formats put the box about 25-30 px left of the icon (about half its width), so the error is not caused by the coordinate format; it looks image-specific and repeatable (3 runs).
- Pixel output depends on the image size the model actually received, which is undocumented, so the normalized grid stays (matches Meta's docs and the percent schema).
- Scratch script lived outside the repo; nothing in the app changed.

### Cursor screenshot at 2x (1 request, about $0.004)
Same notes as the earlier Cursor runs; image upscaled 2x (1556x1160). Box converted back to original pixels: [663, 262, 713, 311] vs measured truth [664, 263, 712, 311], IoU **0.93** (original size: 0.19, 0.26, 0.33). The left-shift disappeared. Taken together with the 800x600 UI screenshot (2x gave identical, accurate boxes twice) and the Google icon (0.45/0.59 -> 0.81), upscaling small screenshots is the most effective fix seen so far. Still one run per case; not implemented (user deferred it).

### Browser-side upscaling (implemented, user-approved)
- `lib/upscale.ts`: images whose long side is under 1400 px are redrawn at 2x on a canvas (smoothing "high") and sent as PNG; larger images are sent unchanged. Any failure (undecodable file, canvas error, result over 10 MB) falls back to the original file. No new dependency. Wired into Generate in `components/Workspace.tsx`; the preview still shows the original, and boxes are percentages so the overlay is unaffected.
- 2x (not "about 1600 px") because 2x is what was tested in every accuracy comparison.
- Tests: 6 new unit tests (sizing rule, fallbacks) with fake decode/render; 50 pass in total.
- Browser check with a stubbed API (0 real calls): a 400x300 upload was sent as `small-2x.png`, 800x600; the 2048-wide Floraday sample was sent unchanged (1.97 MB).
- Not verified: canvas upscaling quality vs the `sips` copies used in the experiments (the browser's "high" smoothing is a different resampler), JPEG inputs, very large inputs near the 10 MB limit, and the live accuracy gain end to end. That needs a few approved live requests.

### End-to-end check of upscaling through the app (2 live requests, about $0.008)
Driven in the browser (file picked, notes typed, Generate clicked); the page recorded the request and response.

| Screenshot (original size) | Sent by the app | IoU vs measured truth | Before (same image, original size) |
|---|---|---|---|
| Cursor voice icon, 778x580 | `cursor-2x.png`, 1556x1160 (276 KB) | **0.81** (box 85.1-91.7 x 46.4-53.7 %) | 0.19, 0.26, 0.33 |
| Pyosi UI Generate button, 800x600 JPEG | `pyosi-desktop-2x.png`, 1600x1200 (323 KB) | **0.97** (box 3.5-32.8 x 61.2-67.2 %) | one run 5% high, one 2% short |

- Both took 1.5-1.7 s; the descriptions kept the requested action ("Check whether the implemented version is identical to the design.").
- The overlay is correct on both. Observation: the Cursor icon box is 6.6% wide, just over the 6% "small box" limit, so its numbered badge stays on the corner and covers part of the icon. The limit may need raising (a UX decision, not changed).
- The browser canvas upscale gave results as good as the `sips` copies used in the experiments (Cursor 0.81 vs 0.93 earlier, same ballpark; one run each).

### Badge limit raised (user-approved)
- `SMALL_BOX_PERCENT` 6 -> 10 (`lib/badge-placement.ts`): a box under 10% wide or high now gets its badge above (or below near the top edge), so icons like the Cursor voice icon (6.2% x 8.3%) are no longer covered. Buttons about 6% high (e.g. Floraday's 14% x 6.4%) also move to "above"; large boxes keep the corner badge.
- Checked in the browser with a stubbed API (0 real calls): the voice icon box shows its badge above it with the icon fully visible; a large box keeps the corner badge. The percent rule is an approximation: the badge is a fixed 24 px, so on very large previews a 10% box is wider than needed and on very small ones a larger box could still be crowded.

### Drop, paste and "New image" (user-approved)
- Drop an image anywhere on the page (a dashed outline and "Drop the image here." show while dragging) or paste one from the clipboard. Text pastes into the notes box are untouched; dropping elsewhere no longer makes the browser open the file. Uses the same validation as the file picker, so a non-image shows the usual "Unsupported file type" message. `lib/dropped-file.ts`, window listeners in `components/Workspace.tsx`.
- Replacing an existing image (picker, drop, paste or sample) clears the notes and annotations; the first image keeps any notes already typed. A **New image** link in the Preview header resets everything.
- Tests: 3 new unit tests for picking the file (53 pass). Checked in the browser with simulated drag, drop and paste events (0 API calls): highlight, drop, paste replacing the image and clearing notes, text paste ignored, PDF drop error, reset.
- Not verified: a real OS drag from Finder and a real clipboard screenshot paste (only simulated events), touch devices. (The "No file chosen" gap was fixed by the layout change below.)
- Download / copy of the annotated image is not implemented (decision pending; it is also listed as out of scope for the MVP in the brief, but as Milestone 4 elsewhere).

### Screenshot section layout (user-approved)
- The file picker, the drop target and the preview are now one **Screenshot** section on the right (it replaces the separate Screenshot field and "Preview"). Empty state: a dashed drop zone with "Choose file", the size hint and the Floraday sample link. With an image: the picture with boxes, a **New image** link, and an **Annotations** list heading once results exist. The notes and Generate button are on the left; on narrow screens the Screenshot section comes first.
- The native file input is hidden and opened by the "Choose file" button, so "No file chosen" no longer shows after a drop or paste, and the same file can be chosen again.
- Dragging shows "Drop the image here." (empty) or a "Drop to replace the image." overlay (image present), so the user knows the page accepts the drop and where it lands.
- The Generate hint ("Add a screenshot..." / "Add some notes...") now has spacing under the button.
- Checked in the browser with simulated events (0 API calls): Choose file opens the picker, drop, paste, drag overlay, PDF error, New image reset, desktop and mobile layout. Not verified: a real OS file dialog and a real Finder drag.

### Open issues / decisions
- The 800x600 desktop screenshot gave inconsistent, partly wrong boxes. Investigated below: it is resolution-related noise, not a fixed offset. Remedy (upscale small images) is proposed but needs approval.
- Output is not deterministic (extra entries between identical requests).
- Mobile and desktop screenshots were taken from this app's own UI; real engineer screenshots (bug reports, logs, dashboards) are untested.
- Visual review of the Generate UI in the browser is still needed (loading and error states were not exercised with a human).

## 2026-10-27: Milestone 2.2-B, Meta Model API grounding spike (complete)
**Status: complete.** Isolated spike; the app, UI and API routes are unchanged and still use mock annotations. Details in `docs/m2-2b-api-spike.md`.

- Script `spikes/m2-2b/run.mjs`: one request per run, no retries, key read only from `.env.local` and never printed. Dry run by default; `--send` makes the request, `--case refresh` selects the not_found case. `spikes/m2-2b/overlay.html` draws the model and ground-truth boxes for a visual check.
- Confirmed from Meta's docs: `POST https://api.meta.ai/v1/chat/completions`, Bearer `MODEL_API_KEY`, model `muse-spark-1.3` (standard mode; `-contributor` trains on prompts and is not used), base64 data URL `image_url` input, `response_format` json_schema.
- Results on the Floraday fixture (2 requests, about $0.0047 each, 1.8-2.1 s): the button was found with IoU 0.933 against the human-measured box and the box lines up visually; the missing Refresh button returned `not_found` with a null box.
- Coordinate convention observed: 0-1000 grid, top-left origin, `[x_min, y_min, x_max, y_max]`, as prompted. Converting to Pyosi's percent boxes means dividing by 10 and turning min/max into x/y/width/height.

### Remaining issues / decisions
- Only two samples: variance, `ambiguous`, `strict: true` and other screenshots are untested.
- Most output tokens were reasoning (about 140 of 200) even at `reasoning_effort: "minimal"`.
- Meta's dashboard showed 1 request after 2 were sent (likely reporting lag; request ids are in the spike doc). Still to confirm.
- `sam-3.1` (boxes and masks) is a possible later spike if Spark's boxes prove loose.
- Confirm the Floraday screenshot may be published before making the repo public.

## 2026-10-27: Milestone 2.1, annotation schema and validation (complete)
**Status: complete.** Prepares the data model for AI output. No model or provider is integrated; everything is still mock/manual data.

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
