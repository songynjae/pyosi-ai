# M5 plan: quality evaluation and stabilization (DRAFT for approval)

Written 2026-10-29. Scope: English notes only (see `docs/test-plan.md`). No voice input.

## 1. Why M5
The owner's observation after a day of testing: **the results are not consistent**, so the product is not at a reliable stage. The development log supports that: the same image and notes gave different numbers of entries, different positions and, once, entries that could not be resolved. M5 turns "looks better on the last image" into measured, repeatable evidence, and fixes only what the measurements show.

**What "reliable" means here (draft criteria, to be confirmed):** on a fixed set of demo cases, each run several times,
1. every expected entry is present and nothing unresolved ("invalid") appears;
2. the kind is right (distance line for a spacing note, box for a normal note, "not found" when the element does not exist);
3. positions are close to the truth: median gap-edge error at most 1.5% of the image's long side, worst case at most 4%;
4. wording rules hold (a question stays a question, numbers and units as written, no repeated descriptions);
5. the same case gives the same entry count in at least 4 of 5 runs.
Pass bar: at least 90% of runs overall and at least 4 of 5 runs for every case we will show in the demo. If a case does not reach it, it is not shown (or shown with the limit stated).

**How the harness applies them** (`eval/score.mjs`, since 2026-10-29): criteria 1, 2 and 4 decide whether a single run passes (a run also fails on an extra distance line, a missing expected entry, a gap more than 4% of the long side off, a distance line more than 3% off across, a repeated description, a question that lost its question mark, or a number with a unit from the notes that is missing). Criteria 3 and 5 are checked per case: the median gap-edge error must be at most 1.5% and the entry count must be the same in at least 80% of the runs. A case meets the bar when at least 80% of its runs pass and 3 and 5 hold; the whole set meets it when at least 90% of all runs pass and every case meets the bar.

## 2. What trial and error already taught us
| Observed | Evidence | Status |
|---|---|---|
| Run-to-run variance in positions, same image and prompt | gap edges off by 0 to 23 px between runs; line height 0 to 19 px low | pixel snapping fixes it where the background is plain (offline: edge error 11 px to 4 px); untested on other UIs |
| Very wide images (3.45:1) gave tall, shifted boxes | edge errors up to 20 px; padding below removed them (all within 3 px); padding above added a 13 px shift | padding below implemented |
| Number of entries varies | 3, 4 or 5 gaps for the same toolbar (a divider counted as an item, the last button left out) | prompts v6 to v9; n = 1 to 3 per version |
| Distance line or plain boxes for a "too close" note | v8 gave boxes, v9 gave a line (n = 1 each) | not measured |
| Entries that could not be resolved | one run with a Korean note on a vertical list; not reproduced | message now says why |
| Wording drift | questions turned into statements, a wish into an obligation | v4 and v10; n = 1 to 2 |
| Prompt tuned on one image | most versions were tried on the Chrome toolbar strip | needs the fixed set |
| **No sampling settings** | the model request sets no `temperature` or `seed` (`lib/meta-client.ts`), so every run samples freely | **untested lever** |
Process lessons: judging from one run misleads; raw model responses were not kept, so failures could not be diagnosed; app errors and model errors must be separated (replaying a saved response through our code does that for free).

## 3. Levers, in the order to try them (each measured on the fixed set before it is kept)
1. **Sampling settings:** try `temperature: 0` (and a fixed `seed` if the API has one). Check the Meta API documentation first; this could reduce variance at no cost.
2. **Prompt consistency:** fix what the baseline shows (kind choice, which items count, the divider and similar cases), one change at a time.
3. **Guardrails in code:** reject or soften implausible markers (outside the image, far longer than the row) instead of drawing them; extend pixel snapping only where a case fails.
4. **(Needs approval, changes an architecture rule)** one automatic retry when an entry is unresolved, or taking the consensus of 2 to 3 requests. Today the rule is one request per Generate, no retries; this costs money and time, so only if 1 to 3 are not enough.

## 4. Fixed demo set (English; 10 cases)
Truth is measured from pixels, never by eye. Images that contain personal data stay outside the repository.
| ID | Image | Note | Expected |
|---|---|---|---|
| D1 | Chrome toolbar strip (outside the repo: profile photo) | spacing between the icons | 4 horizontal gaps |
| D2 | Icon list (Image / Audio / Segment), exported with "Original image" | spacing between the icons, plus review the Audio icon | 2 vertical gaps + 1 box |
| D3 | Floraday sample | card and bottom button too close | 1 vertical gap |
| D4 | Floraday | the photo is too large | box only, no distance line |
| D5 | Floraday | the Refresh button is too far from the title | not found |
| D6 | Synthetic row of 6 squares, known gaps | spacing between the squares | 5 gaps at known positions |
| D7 | Synthetic tall list of 8 items | spacing between all items | 7 vertical gaps |
| D8 | Floraday or toolbar | one box note and one spacing note together | 1 box + 1 gap |
| D9 | Synthetic PCB top view (labels U1, H1, C3, J1) | clearance between C3 and J1 (at least 5 mm), and H1 overlaps U1 | 1 horizontal gap + 1 box on the overlap |
| D10 | Synthetic mounting plate (holes, red hatched keep-out zone) | spacing between the two top holes should be 40 mm, and anything inside the keep-out zone | 1 horizontal gap + 1 box on the zone |
Possible additions if time allows: a dark-mode UI, a very small image.

## 5. The harness (small version of `docs/test-plan.md` section 5)
- `scripts/eval.mjs`, **dry run by default**; `--send` makes live requests (cost, so approved per run). No new dependency.
- Each case is stored in the form the app would send (the padded or 2x PNG) with the padding plan and the original image, plus a ground-truth file. It runs the app's own code: request, `parseModelOutput`, mapping back from the padded image, and pixel snapping on the original image's pixels. It does not repeat the browser's canvas resampling.
- Each case runs 5 times. Raw responses go to `.eval/<date>-<prompt version>/` (git-ignored) so any failure can be replayed for free.
- Output: a table per case and overall against the criteria in section 1; a short report appended to `docs/eval-log.md`.
- First step costs nothing: replay the responses already saved from earlier experiments to check the metrics code.

## 6. Schedule (Thursday 2026-10-29)
| When | Work | Cost |
|---|---|---|
| Morning | Build the cases, ground truth and harness; check them by replay | none |
| Midday | Baseline run of the current build: 10 cases x 5 runs = 50 requests | about $0.25 (done 2026-10-29; see `docs/eval-log.md`) |
| Afternoon | Read the Meta API documentation for sampling settings; fix the top failure modes in order of how often and how badly they occur; re-run only the affected cases | up to about $0.15 (needs approval) |
| End of day | Final run and report; decide which cases are safe to show | within the above |
Friday is M6 (deploy and submit). Nothing new after the Friday freeze.

## 7. Exit criteria
Either the pass bar in section 1 is met for the demo cases, or the cases that miss it are removed from the demo and the limits are written down (README and dev log). Either way the numbers, not impressions, decide.

## 8. Inputs needed from the owner
1. Approval of this plan and of the budget for the baseline run and the fixes (about $0.35 in total).
2. The original of the Image / Audio / Segment screenshot (export it with the "Original image" format) and, if possible, one dark-mode UI screenshot.
3. Which cases you want in the demo (the set above is a proposal).
