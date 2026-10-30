# Pyosi: Product Brief

## One-liner
Pyosi turns screenshots and rough technical notes into clear, structured, editable visual explanations.

## Target users (unvalidated assumption)
- **Primary:** engineers who collaborate through screenshots (bug reports, PR discussions, incident threads).
- **Secondary:** product managers, designers and other professionals who explain things with screenshots.

## Problem
Screenshots shared in chat or tickets usually need a paragraph of explanation, and readers have to guess which part of the image the text refers to.

## Solution
The user uploads a screenshot and types rough notes. Pyosi produces numbered callouts and bounding boxes over the screenshot, plus a short structured explanation for each.

## MVP scope (deadline: 2026-11-04, 9 pm ET)
In scope:
- Screenshot upload and rough-notes input
- AI-generated annotations (numbered callouts, bounding boxes) with short explanations
- Preview of the annotated screenshot
- Basic annotation editing (move, resize, delete boxes; edit label and description)
- Distance lines for spacing and length notes (gap between elements, width or height of an element)
- Export of the annotated screenshot as PNG (download and copy), at the original image size

Out of scope for the MVP:
- Advanced annotation editing (adding boxes, moving numbered badges)
- Accounts, history and collaboration

## Milestones
1. **Scaffold + mock UI (done):** single page, upload, notes, Generate, preview with mock annotations.
2. **AI integration (done):** a server-side API route that sends the screenshot and notes to the model (Meta Muse Spark) and returns annotations.
3. **Basic editing (done):** move, resize and delete boxes; edit label and description.
4. **Export + accuracy (done):** PNG export (download and copy), distance lines for spacing notes, pixel snapping, padding of very wide images. Plan: `docs/m5-plan.md`.
5. **Quality evaluation and stabilization:** results that are consistent enough to demo, measured on a fixed set of demo cases with repeated runs (`docs/m5-plan.md`, `docs/test-plan.md`).
6. **Prepare and submit:** the hackathon form asks for a public GitHub repository and a 3-minute demo video (no deployed URL), plus text answers. Work: public-repository preparation (license, README with how to run and Data handling, known limits, review of docs and history), a stable demo path, the video, the form answers. A public deployment is not part of the plan (decided 2026-10-29); if one is added later, the API route needs access control and a rate limit first. Plan: `docs/m6-plan.md`. Feature freeze: Friday 2026-10-30; deadline 2026-11-04 21:00 ET.

## Open questions
- Which model/provider handles vision input?
- How accurate are model-generated bounding boxes, and is a manual correction step required?
- Are engineers really the best first audience?
