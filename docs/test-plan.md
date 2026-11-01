# Test plan and procedure (DRAFT v2 for approval)

First written 2026-10-28; rewritten 2026-10-29 after the first M5 measurements. Nothing in the thresholds is final: they are drafts to be calibrated by looking at real outputs (section 6).

> **MVP scope decision (2026-10-29): English notes only, no voice input.** The Korean cases are moved to "after the MVP".

## 1. What this plan validates
The whole annotation flow, not only the distance lines: upload -> notes -> Generate -> boxes and numbered callouts (found / not found / ambiguous) -> edit -> export. The purpose of the app is to **mark the element a note refers to, accurately and the same way every time**, and explain it in a few words.

Until 2026-10-29 the live measurements (M5 baseline, prompts v10 to v14) covered mostly distance lines: 8 of 10 cases involved a gap, and only one case (D4) was a plain box note. That was a gap in the plan, not a decision. The areas below make the intended coverage explicit.

## 2. Levels of verification
| Level | What it proves | How | Cost |
|---|---|---|---|
| L1 Automated | Code logic (parsing, geometry, mapping, export math) | `npm test`, `tsc`, `lint`, `build`; the model API is a fake `fetch` | free |
| L2 Replay | The parser and the app handle real model answers | Raw responses saved by L3 are replayed through our code (`--replay`) | free |
| L3 Live evaluation | The model does what the prompt asks, on a fixed case set | `npm run eval`: each case k times, raw responses stored, metrics table | about $0.005 per request |
| L4a Browser check by Claude | Editing, export and layout behave on the real page | Local dev server, built-in browser, the model API replaced by a stubbed answer | free |
| L4b Human review | Taste and feel; Safari; whether results look right | Checklist in section 7 | time |

## 3. Areas, what is measured, and how
| Area | Question | Measure |
|---|---|---|
| A. Target identification | Is the box on the element the note refers to? (bug report, design review, question, comparison) | IoU between the box and the ground-truth box; share of notes with the right element found |
| B. Ambiguous and missing | Several equal elements -> `ambiguous`; named element not visible -> `not_found`, never a substitute | right status rate; number of invented boxes |
| C. Screen variety | Same questions on dark mode, mobile portrait, dense UI, small and large images, very wide strips | A and B split by screen type |
| D. Wording | Question stays a question; numbers and units kept; no repeated descriptions; notes' tone | automatic checks, plus a few read by a person |
| E. Consistency | Same case run several times | entry-count agreement, box movement between runs |
| F. Distance lines (secondary) | Gaps between items, the 10 cases D1 to D10 | existing harness (`eval/`), see `docs/eval-log.md` |
| G. Editing and export | Move, resize, delete, text edit, PNG download and copy | checklist, section 7 |

## 4. Case sources
1. **Existing distance set D1 to D10** (`eval/cases.mjs`). Keep. Known issue: D1 asks about "icons" while the strip also contains a wide text button; the ground truth counts it. Score both readings (button included or not) before judging D1.
2. **Previous-project cases** (the previous project's test setup folder): 22 cases on 4 screenshots with human-measured boxes, including hover cues, explicit names against visual cues, identical cards (ambiguous), a single button (must not be ambiguous) and invisible named elements. Reuse where the ground truth is solid. Two cases in its proposed validation set (mobile portrait, dense UI) are still missing a screenshot. The ground truth there is single-annotator; treat borderline boxes as such. Before copying any image into this repository, check that it has no personal data (otherwise keep it in `.eval-private/`).
   **Converted 2026-10-29** (`eval/cases-previous.mjs`, run with `npm run eval -- --set previous`): 12 cases (CM1 to CM11 and CM3b) on the owner's own Floraday web app, English notes (the originals were Korean and are kept in each case), expectations `target` (box overlap, IoU), `ambiguous` and `absent`. Cases 12 to 21 of the proposed validation set are not converted (no ground truth yet; two need new screenshots). The three screenshots that show the browser window (tab, address bar, profile picture, menu bar) are copied to `.eval-private/previous/` and are not committed; the cases are skipped when the files are missing. Scoring additions in `eval/score.mjs`: IoU thresholds 0.5 (hit) and 0.7 (good), draft; no pass bar is applied to this set yet.
3. **New screenshots taken by Claude** for the gaps in area C: dark mode, mobile portrait, dense UI, small and large images. Public pages that need no login, or Pyosi's own screens. Ground truth comes from the page itself (element rectangles read in the browser at the same viewport as the screenshot), not from eyeballing. Third-party screenshots stay in `.eval-private/` (git-ignored).
   **Done for text-heavy screens (2026-10-30):** four mock screens with fake data (a purchase order, an email, a chat, an invoice; `eval/fixtures/text/`, cases `eval/cases-text.mjs`, `npm run eval -- --set text`); results in `docs/eval-log.md`. Dark mode, mobile portrait and dense UI are still not measured.

**Tuning and held-out sets.** Cases are split into a *tuning* set (used while changing prompts) and a *held-out* set (looked at only for the final check). Roughly 12 + 8 for areas A to E, plus the existing D1 to D10.

**Known bias.** The same assistant (Claude) writes the cases and the prompts. To reduce this, some cases are not used while changing prompts and are used only for the final check.

## 5. Procedure (L3) and criteria
1. `npm run eval` loads the case set and calls the same code as the route; dry run by default, `--send` makes live requests and needs the owner's approval of the number of requests and the cost beforehand (about $0.005 each; about 60 requests, roughly $0.30, is the proposed size for areas A to E).
2. Each case runs 3 times; raw responses go to `.eval/<date>-<prompt version>/` (git-ignored) so any failure can be replayed for free.
3. Reporting changes from the earlier draft: (a) **share of passing runs and the reasons for failures are reported; with 3 runs a per-case "80%" means 3 of 3, so it is not used as a gate for comparing prompt versions**; (b) entry-count agreement is shown as information, not as a failure, when every variant is acceptable (D8: 2 to 4 entries); (c) versions are only compared when run with the same number of runs per case (v10 used 5, v11 and v14 used 3).
4. **Draft thresholds** (to be calibrated, section 6): IoU of at least 0.5 counts as a hit and at least 0.7 as a good hit; gap-edge error as in `docs/m5-plan.md` for area F.
5. A prompt or schema change is adopted only if it does not lose ground on the tuning set and does not fail the held-out set.

## 6. Calibrating the thresholds
The numbers above are not tied to what a person sees as wrong. Before using them as a gate: render about 10 outputs with different IoU and edge errors, and ask the owner which ones look wrong. Set the thresholds from that.

## 7. Browser check and human review (areas G and parts of D)
L4a = checked by Claude in the built-in browser with a stubbed model answer (no cost). L4b = needs the owner. "Partly" means Claude checks that it works; the owner judges the feel or look. Results are recorded in section 8.

| # | Item | Who | Method |
|---|---|---|---|
| 1 | Move a box: the box and its badge move together and stay inside the image | L4a | pointer drag in the page, read positions |
| 2 | Resize a box: the handles work and the minimum size holds | L4a | same |
| 3 | Delete with the key and with the button; list and picture update together | L4a | |
| 4 | Edit label and description: the picture, the list and the export show the new text | L4a | |
| 5 | Close badges do not overlap | L4a | read badge positions |
| 6 | Distance line ends touch the items' edges (stubbed gap on the Floraday fixture) | L4a | compare with the ground-truth pixels |
| 7 | Export PNG: original size, and the boxes, lines, numbers and list are where they are on screen | L4a | read the export canvas result and compare |
| 8 | File name and image size of the export | L4a | |
| 9 | Error text for a failed request or an unusable entry says what is wrong | L4a | stubbed error answers, read the text |
| 10 | Layout with a small, a large and a very wide image, and at a narrow window | L4a | screenshots |
| 11 | Copy produces an image of the expected size | partly | clipboard may be blocked in the pane; the image data is checked |
| 12 | Paste of the copied image into another app, Chrome and Safari | L4b | done by the owner on 2026-10-28 and 2026-10-29 |
| 13 | Download dialog in Safari | L4b | |
| 14 | Dragging feels natural; handles are easy to grab | L4b | |
| 15 | Colours, spacing and text sizes look right (also after the Friday UI polish) | L4b | |
| 16 | Do real model results look right for 5 to 10 samples (calibration, section 6) | L4b | |

## 8. Results of browser checks
2026-10-29, local dev server (`npm run dev`, port 3000), built-in browser, the model API replaced by a stubbed answer (Floraday sample, exact ground-truth boxes), no cost. Branch `feat/gap-to-next` (prompt v14); the checked behaviour is the same on `main`.

| # | Result | Evidence |
|---|---|---|
| 1 Move | **Pass** | Drag of (-77, -19) px moved the box by exactly that; the badge kept its offset (-10, -10). Dragging far outside stops at the image edge (right edge 569 of 569, bottom 313 of 312). |
| 2 Resize | **Pass** | Bottom-left handle moved left and bottom edges only (right and top fixed). Dragged past the opposite corner, the box stops at a minimum of about 1% of the image (6 x 4 px on screen), not inverted. The minimum is very small and hard to grab again (item 14). |
| 3 Delete | **Pass** | Delete key and the "Delete annotation" button each remove the entry; the list and the picture update together and the badges renumber. |
| 4 Text edit | **Pass** | New label and description appear in the list and in the exported PNG. |
| 5 Badge overlap | **Pass** | Badges 2 and 3 are 26 px apart (diameter 24) on desktop and on a 375 px wide window; they touch but do not overlap. |
| 6 Distance line ends | **Fail (finding)** | See below. |
| 7 Export matches the screen | **Pass** | The exported PNG shows the same boxes, badges, the edited text, the tiny box left from item 2 and the same distance line as the screen; the list below the picture is readable. |
| 8 File name and size | **Pass** | `floraday-annotated.png`, 2048 px wide (the original width) and 1522 px high (image 1124 plus the list). |
| 9 Error text | **Partly** | "The model API returned no content." says what went wrong, but not what to do (retry). A bad answer is shown as "Entry 3 (ann-3): value: Invalid input: expected string, received null" and "box.height: y + height must be <= 100": correct, but technical. A failed Generate also clears the existing annotations (the owner chose no warning on 2026-10-27). |
| 10 Image sizes and narrow window | **Pass** | 400 x 300 is sent at 800 x 600; 3000 x 1600 is sent unchanged; 1800 x 400 is sent as 1800 x 900 (padding below) and its box maps back to the original; 300 x 1200 is sent at 600 x 2400 and the page scrolls. No horizontal scroll at 375 px; the layout stacks. |
| 11 Copy image data | **Pass (data only)** | `ClipboardItem` receives one `image/png` of 2048 x 1522; the real clipboard was not written (intercepted). |

**Finding for item 6.** With the Floraday card and button, the exact ground truth gap (card bottom 978 px, button top 1023 px, read from the pixels) is drawn by the app as 986 to 1050 px, whatever the starting value (exact, 5 px low or 20 px low all give the same result): the lower cap sits inside the button, near its label, and the line is also narrower (x 920 to 1133 instead of 883 to 1169). Cause: the button is a light grey outline on white, below the ink threshold (`INK_DIFF` 30, "a light grey pill on white does not count" in `lib/refine-gap.ts`), so the snap treats the button's dark text as its top edge; the allowed shift (the larger of 24 px and 60% of the marker length = 27 px) lets it move that far. The harness still passes D3 because its limits are 4% (worst edge) and 1.5% (median) of the image's long side, about 82 px and 31 px here: the errors are 8 px and 27 px. **This is the clearest example that those thresholds do not match what a person sees as wrong** (section 6). Not fixed: changing the snapping alters visible behaviour and needs the owner's approval and a measurement on the distance cases.

**Follow-up, same day (offline, no cost; saved v13/v14 answers: 50 gaps in 8 cases, plus the true gap of every case shifted by 0, 6 and 12 px).** Six variants of the snapping were compared by edge error in px (median / worst): lower move limit (12 px and 8 px), lower ink threshold (20 and 15), a "faint full-width line counts as ink" rule, and that rule with the 12 px limit. **None beat the current code on the model answers** (median 1 px, worst 76 px, against 18 px / 83 px with no snapping): the move limits lose the gains on D2, D6 and D9 (their model boxes are more than 12 px off), threshold 20 makes D3 and D8 worse (17 px), threshold 15 breaks D1 (34 px), and the faint-line rule changes nothing on model answers and only partly helps the exact-input case (33 px worst instead of 27 px median). The overshoot appears only when the model's value is already accurate and within the move limit; in the 3 saved D3 answers the snap kept the model's value (error 4 to 5 px), so the effect on real runs is smaller than the exact-input test suggests. **Decision: the snapping code stays as it is; the case is recorded as a known limit** (light grey outlines on white). The comparison script is not part of the repository.
