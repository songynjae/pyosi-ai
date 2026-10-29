# Test plan and procedure (DRAFT for approval)

Written 2026-10-28 after a user test with Korean notes on a column of icons failed (two measurement entries came back invalid). It audits how Pyosi has been validated so far and proposes a structured procedure. Nothing here is approved or implemented yet, except where marked.

## 1. Levels of verification
| Level | What it proves | How | Cost |
|---|---|---|---|
| L1 Automated | Code logic (parsing, geometry, mapping, export math) | `npm test`, `tsc`, `lint`, `build`; the model API is a fake `fetch` | free |
| L2 Replay | The parser and the app handle real model answers | Raw model responses recorded in L3 are replayed through `parseModelOutput` | free |
| L3 Live evaluation | The model does what the prompt asks, on a fixed case set | A script sends each case k times, stores raw responses, prints a metrics table | about $0.005 per request |
| L4 Human review | Visual quality and UX (lines, badges, PNG, Copy) | A checklist, run by the user | time |

## 2. Audit of what exists (2026-10-28)
- **L1: good.** 136 tests, all passing. They cover logic, not model behaviour.
- **L2: missing.** Raw model responses were never kept. The failing Korean run cannot be diagnosed from what we stored; only the "invalid" messages survive.
- **L3: ad hoc, not a procedure.** About 30 live requests over the project, each from a throw-away script outside the repo. No fixed case list, no stated pass/fail thresholds, 1 to 3 runs per case, results written into the dev log by hand. Prompt versions v2 to v9 were each tried on 1 to 3 images, mostly the same Chrome toolbar strip, so v9 is tuned to that image.
- **Coverage gaps (several were listed as "not tested" and are exactly where the latest failure happened):** columns (vertical groups), Korean or other non-English notes, notes that mix boxes and distances, a distance that does not exist in the image, many items (more than 5), very small and very large images, dark UIs.
- **L4: informal.** Done through screenshots in chat; no checklist, so items (for example the exported PNG against the on-screen view) were checked unevenly.
- **Process risk:** changes were judged by "looks better on the last image", which can hide regressions on other cases.

## 3. Proposed acceptance criteria (numbers are proposals for you to change)
For the distance feature, over the whole case set, 3 runs per case:
1. **Resolves:** at least 95% of measurement entries become a marker (no "invalid" entry).
2. **Kind:** at least 90% of the cases tagged "distance" produce measurement entries, and "box" cases produce none.
3. **Completeness:** at least 90% of the expected gaps are present.
4. **Position:** median gap-edge error at most 1.5% of the image's long side, worst case at most 4%, vertical centre of a marker within 1% of the image height.
5. **Content:** a question stays a question, numbers and units are as written, no two entries share a description (checked automatically where possible).
6. **Stability:** the same case run 3 times gives the same entry count at least 2 of 3 times.

## 4. Case set (draft, 14 cases; images must be free of personal data)
| ID | Image | Notes | Expected |
|---|---|---|---|
| C01 | Chrome toolbar strip, 3.45:1 (kept outside the repo: shows a profile photo) | EN: spacing between the icons | 4 gaps, horizontal |
| C02 | Same | KO: same request | same as C01 |
| C03 | Icon list with Image / Audio / Segment (the user's failing image, needs a copy) | KO: check each icon's spacing, plus review the Audio icon | 2 vertical gaps + 1 box |
| C04 | Same | EN version of C03 | same |
| C05 | Floraday 2048x1124 | card and button too close | 1 vertical gap |
| C06 | Floraday | card too narrow | 1 width |
| C07 | Floraday | "photo too large" | box only, no measurement |
| C08 | Floraday | gap that is not there ("the Refresh button is too far") | `not_found` |
| C09 | Synthetic: 6 squares in a grid with known gaps | gaps between squares | known positions |
| C10 | Synthetic: tall list, 8 items | spacing between all items | 7 gaps, vertical |
| C11 | Small image (about 400x300) with two buttons | spacing | gap found after upscaling |
| C12 | Large image (about 3000x1600) | one named gap | one marker |
| C13 | Dark-mode UI | spacing | gap found |
| C14 | A mixed note: one box and one distance | both | 1 box + 1 marker |

Each case has a ground-truth file (pixel boxes of items, expected entries) measured from pixels, not by eye.

## 5. Procedure (L3)
1. A script (`scripts/eval.mjs`, dry run by default like `spikes/m2-2b/run.mjs`, `--send` to spend money) loads the case set and calls the same code as the route (`requestAnnotations`, `parseModelOutput`), so the app's prompt and parser are what is tested.
2. Each case runs k = 3 times. Raw model responses are saved to a git-ignored folder (`.eval/<date>-<prompt version>/`).
3. The script prints a table (per case and total) against the criteria in section 3 and writes a short report to `docs/eval-log.md`.
4. A full run is about 42 requests, roughly $0.20. The user approves each run's budget beforehand; no automatic retries.
5. Any prompt or schema change must run the full set before it is adopted, and the result is compared with the previous run's numbers. A failing real-world case becomes a new case, with its raw response saved as an L2 replay fixture.
6. L4: the user runs the checklist in section 6 on the build under test.

## 6. Human review checklist (L4)
- Distance markers: ends sit at the items' edges; the value label is readable; the badge does not cover content.
- Several badges close together do not overlap.
- Download PNG: the picture matches the on-screen view (boxes, markers, numbers, list text); the file name is correct; Copy pastes into another app (Chrome and Safari).
- Invalid or skipped entries: the on-screen message is understandable (it now says which item name was not found).
- Edits (move, resize, delete, text) work on a marker and on a box.

## 7. Immediate fix made on 2026-10-28 (implemented)
Entries that point at nothing usable now say why, for example: `measurement item "Image icon" not found in group "g1" (items: "Image", "Audio", "Segment")`, instead of "a found annotation requires a box".
