
## 2026-10-29, prompt annotate.v10, commit 9ad00f9
Overall 28/50 runs pass. Raw responses: .eval/2026-10-29-annotate.v10 (git-ignored).

| case | pass | entries | invalid | median edge | max edge |
|---|---|---|---|---|---|
| D1 | 4/5 | 3-4 | 0 | 0.1% | 3.2% |
| D2 | 0/5 | 3-3 | 0 | 0.2% | 7.3% |
| D3 | 5/5 | 1-1 | 0 | 0.2% | 0.2% |
| D4 | 5/5 | 2-2 | 0 | - | - |
| D5 | 0/5 | 1-1 | 0 | - | - |
| D6 | 4/5 | 5-5 | 0 | 0.0% | 3.6% |
| D7 | 0/5 | 7-7 | 0 | 5.3% | 11.7% |
| D8 | 0/5 | 2-2 | 0 | 0.2% | 0.2% |
| D9 | 5/5 | 3-3 | 0 | 0.0% | 0.0% |
| D10 | 5/5 | 2-2 | 0 | 0.1% | 0.1% |

## 2026-10-29, prompt annotate.v11, commit 21ea831
Overall 7/15 runs pass. Raw responses: .eval/2026-10-29-annotate.v11 (git-ignored).

| case | pass | entries | invalid | median edge | max edge |
|---|---|---|---|---|---|
| D1 | 3/3 | 4-4 | 0 | 0.3% | 3.2% |
| D2 | 1/3 | 2-3 | 1 | 0.2% | 5.9% |
| D5 | 0/3 | 2-2 | 0 | - | - |
| D7 | 0/3 | 7-7 | 0 | 4.2% | 10.1% |
| D8 | 3/3 | 2-2 | 0 | 0.2% | 0.2% |

## 2026-10-29, prompt annotate.v11, commit 21ea831
Overall 14/15 runs pass. Raw responses: .eval/2026-10-29-annotate.v11 (git-ignored).

| case | pass | entries | invalid | median edge | max edge |
|---|---|---|---|---|---|
| D3 | 3/3 | 1-1 | 0 | 0.2% | 0.2% |
| D4 | 3/3 | 1-2 | 0 | - | - |
| D6 | 3/3 | 5-5 | 0 | 0.0% | 1.3% |
| D9 | 2/3 | 2-3 | 1 | 0.0% | 0.0% |
| D10 | 3/3 | 2-2 | 0 | 0.1% | 0.1% |

## 2026-10-29, prompt annotate.v11, commit 21ea831 (replay)
Overall 24/30 runs pass. Raw responses: .eval/2026-10-29-annotate.v11 (git-ignored).

| case | pass | entries | invalid | median edge | max edge |
|---|---|---|---|---|---|
| D1 | 3/3 | 4-4 | 0 | 0.3% | 3.2% |
| D2 | 1/3 | 2-3 | 1 | 0.2% | 5.9% |
| D3 | 3/3 | 1-1 | 0 | 0.2% | 0.2% |
| D4 | 3/3 | 1-2 | 0 | - | - |
| D5 | 3/3 | 2-2 | 0 | - | - |
| D6 | 3/3 | 5-5 | 0 | 0.0% | 1.3% |
| D7 | 0/3 | 7-7 | 0 | 4.2% | 10.1% |
| D8 | 3/3 | 2-2 | 0 | 0.2% | 0.2% |
| D9 | 2/3 | 2-3 | 1 | 0.0% | 0.0% |
| D10 | 3/3 | 2-2 | 0 | 0.1% | 0.1% |

## 2026-10-29, prompt annotate.v12, commit 4fc3b6d
Overall 7/9 runs pass. Raw responses: .eval/2026-10-29-annotate.v12 (git-ignored).

| case | pass | entries | invalid | median edge | max edge |
|---|---|---|---|---|---|
| D1 | 3/3 | 4-4 | 0 | 0.1% | 1.5% |
| D2 | 1/3 | 2-3 | 1 | 0.2% | 0.2% |
| D9 | 3/3 | 3-3 | 0 | 0.0% | 0.0% |

## 2026-10-29, prompt annotate.v14, commit 4c29de4
Overall 21/30 runs pass. Raw responses: .eval/2026-10-29-annotate.v14-full (git-ignored).

| case | pass | entries | invalid | median edge | max edge |
|---|---|---|---|---|---|
| D1 | 1/3 | 3-4 | 0 | 0.1% | 0.3% |
| D2 | 0/3 | 3-4 | 0 | 0.2% | 0.2% |
| D3 | 3/3 | 1-1 | 0 | 0.2% | 0.2% |
| D4 | 3/3 | 2-2 | 0 | - | - |
| D5 | 2/3 | 2-3 | 0 | - | - |
| D6 | 3/3 | 5-5 | 0 | 0.0% | 0.0% |
| D7 | 0/3 | 7-8 | 0 | 6.5% | 9.1% |
| D8 | 3/3 | 2-4 | 0 | 0.2% | 0.2% |
| D9 | 3/3 | 5-5 | 0 | 0.0% | 0.0% |
| D10 | 3/3 | 2-2 | 0 | 0.1% | 0.1% |

## 2026-10-30, prompt annotate.v12: mock GUI, chat and "not found" notes (text set, T5 to T7)
Raw responses: `.eval/t5-total-qty`, `.eval/t6-projects`, `.eval/t7-chat` (git-ignored). 9 live requests, about $0.045. Criteria were fixed before each run; nothing was changed after seeing results.

| case | notes | runs | result |
|---|---|---|---|
| T5 | "The total quantity is missing." (purchase order, no quantity total) | 3 | pass 3/3: `not_found`, no box |
| T6 (Atlas, six similar cards) | message: Share button on the Delta card and the Draft badge on the Harbor card | 3 + 3 | both targets in 6/6 runs, within 1 to 2 px, median IoU 0.92 and 0.93; 1 of 6 also boxed two whole cards; strict harness 0/6 (polite question restated) |
| T7 (chat) | "...the message where she confirms the price, and the one where she promises the discount." | 3 | pass 3/3: price message IoU 0.98, discount `not_found` |


## 2026-10-31, prompt annotate.v12: four more text cases (T8 to T11; 12 live requests, about $0.06)
Cases, notes and expectations were written into `eval/cases-text.mjs` before the run and were not changed afterwards. The first plan named a "shipping fee" for the invoice case, but the invoice has a "Freight, Busan" line, so T11 asks for a purchase order number instead (changed before any run). In the plan these cases were numbered T8, T9, T11 and T13; they are renumbered T8 to T11, and the raw answer files in `.eval/2026-10-31-t8-t13` carry the new numbers. Raw answers: `.eval/2026-10-31-t8-t13` (git-ignored).

| Case | Note | Runs | Result |
|---|---|---|---|
| T8 (Atlas) | "The Archived badge is hard to notice." | 3 | pass 3/3, median IoU 0.93 |
| T9 (Atlas) | "The Share button does not work." (six Share buttons) | 3 | pass 3/3: `ambiguous`, no box |
| T10 (email) | "Please open the attachment that Min-jun sent and check it." (the email has no attachment) | 3 | pass 3/3: `not_found`, no box |
| T11 (invoice) | "Please check the purchase order number on this invoice." (none on the invoice) | 3 | pass 3/3: `not_found`, no box |

12 of 12 runs pass. Only 3 runs per case and the cases are easy ones for a screen with plain text, so this shows the behaviour on these four notes, not a rate.

## 2026-10-31, prompt annotate.v12: a phone screenshot of a made-up weight app (text set, T12 to T19; 24 live requests, about $0.12)
Screen: `eval/fixtures/text/t6-weight.html` (390x844, fake data; the first tall image in the evaluation, sent as 780x1688 after the 2x upscale). Cases, notes and expectations were written into `eval/cases-text.mjs` before the run and were not changed afterwards. Raw answers: `.eval/2026-10-31-t12-t19` (git-ignored). 9 of 24 runs pass (38%); nothing was tuned or dropped.

| Case | Note | Result (3 runs) |
|---|---|---|
| T12 | "The settings icon is hard to find." (icon-only tab bar) | 0/3: `not_found` in all three. The gear in the fixture is drawn as a circle with eight rays and may read as a "brightness" icon; this was noticed after the run and the case was not changed |
| T13 | "The goal line and its label are too faint." | 0/3: line and label found, but the boxes sit 13 to 42 px above or below the real line (overlap 0.00 to 0.42) |
| T14 | "The weight shown in the chart tooltip looks like a typo." | 1/3: boxes 4 to 27 px off vertically (median overlap 0.41) |
| T15 | "The big number does not match the latest entry." | 0/3: the big number found (overlap 0.48 median), the latest entry box 30 to 55 px too high |
| T16 | "The gap between the Add weight button and the tab bar is too big." | 3/3: gap line accepted |
| T17 | "The edit icon is too small." (three identical icons) | 2/3: `ambiguous` twice, one run boxed a single icon |
| T18 | "Please check the calorie summary." (none on screen) | 3/3: `not_found`, no box |
| T19 | message about the 1M tab and the Add weight button | 0/3: the model also boxed the 1W tab and put the Add weight box 5 to 33 px too high; strict wording rule failed as in T6 |

What it shows: horizontal positions are right (box edges at 16 and 374 px for a full-width button), but vertical positions on this tall image vary by tens of pixels from run to run, so small or thin targets fail. "Not found" and "ambiguous" answers still hold. This is the first tall image tested (`lib/pad-aspect.ts` says tall images were never tested); one screen and three runs per case, so it is a finding about this screen, not a rate. No code, prompt or app change; the limit belongs in the README's known limits if the owner agrees.

### 2026-10-31: experiment on how a tall image is sent (no app change; 72 live requests, about $0.36)
Same cases (T12 to T19), same notes and scoring, 3 runs each; only the image sent to the model differed. The app was not changed: the experiment script lives outside the repository and uses the repository's modules as they are. Raw answers: `.eval/2026-10-31-tall-none`, `-padr15`, `-square` (git-ignored).

| Image sent to the model | Size sent | Runs passing |
|---|---|---|
| The app today (2x upscale) | 780x1688 | 9 of 24 |
| No upscale | 390x844 | 11 of 24 |
| White padding on the right to 1:1.5, then 2x | 1126x1688 | 7 of 24 |
| White padding on the right to a square, then 2x | 1688x1688 | 12 of 24 |

Per case with the square copy: T14 (tooltip) 1/3 to 3/3 (median overlap 0.93); T19 (message about the 1M tab and the button): boxes now right (median overlap 0.95; the strict wording check still fails as in T6); T16 and T18 3/3; T17 3/3; T13 (goal line), T15 (latest entry) and T12 (settings icon) still 0/3.
Reading: padding to a square looks better for mid-sized targets, but the differences are small (24 runs per row, the cases were already seen), so this is a lead, not a result. Confirming it needs a second phone screen that was not used here. Not adopted; the app is unchanged.

### 2026-10-31: held-out check of the square padding on a second phone screen (T20 to T27; 48 live requests, about $0.24)
Second screen: `eval/fixtures/text/t7-sleep.html` (390x844, a made-up sleep app, fake data), not used to choose the method. Eight cases of the same kinds as T12 to T19, written into `eval/cases-text.mjs` before any run and not changed afterwards. Each case 3 runs with the app's current method (2x upscale, 780x1688) and with the square copy (white padding on the right to a square, then 2x, 1688x1688). Raw answers: `.eval/2026-10-31-t20-t27` and `.eval/2026-10-31-tall-square-T20`.

| Case | App today | Square copy |
|---|---|---|
| T20 profile icon in the tab bar | 0/3 | 3/3 |
| T21 goal line and label | 0/3 | 1/3 |
| T22 tooltip | 1/3 | 3/3 |
| T23 big number and Deep sleep card | 0/3 | 2/3 |
| T24 gap, button to tab bar | 3/3 | 3/3 |
| T25 three identical arrows (ambiguous) | 3/3 | 3/3 |
| T26 heart rate graph (not on screen) | 3/3 | 3/3 |
| T27 message: selected tab and button | 0/3 | 0/3 (boxes right in most runs, median overlap 0.96 against 0.64; the strict wording check fails in all runs, as in T6 and T19) |
| **Runs passing** | **10 of 24** | **18 of 24** |

Over both phone screens: 19 of 48 runs pass with the app's method, 30 of 48 with the square copy. The direction is the same on the screen that chose the method and on the one that did not. Limits: 3 runs per case, two screens drawn by the same author, one kind of app; a third variant (padding to 1:1.5) scored below the app's method on the first screen (7 of 24), so differences of a few runs are noise here, and this one (8 runs on the held-out screen) is larger than that. Images between 1:1 and 1:2 were not tested. Not adopted: the app is unchanged.

### 2026-10-31: the square padding is now in the app (owner's decision: change the app if it can be finished today)
`lib/pad-aspect.ts`: an image between 2:1 and 3:1 tall (height over width) is sent with white padding on the right up to a square; wider than 2.5:1 is padded below as before; everything else is sent as before. Images taller than 3:1 and 16:9 phone screens (1.78:1) were not tested and are not padded. The boxes the model returns are mapped back to the original image with the existing mapping (`mapBoxFromPadded` already handled a padded width). `scripts/eval.mjs` pads the same way (`padTo` in `eval/png.mjs`).
- Replay of the saved experiment answers through the repository's own code reproduces the table above: 12 of 24 (T12 to T19) and 18 of 24 (T20 to T27).
- Of all evaluation cases only D7 (a synthetic tall list of 8 items, 300x820) changed its input. D7 earlier: 0/5, 0/3, 0/3, 0/3 across versions; with the padding **5 of 5** (median edge error 0.0%, 5 live requests, about $0.025; raw answers `.eval/2026-10-31-d7-padded`). One case, 5 runs.
- Browser check with a stubbed API (no cost): a 390x844 picture was sent as a 1688x1688 copy and a box returned for the copy landed on the right place in the overlay (84.10%, 93.72%).
- Unit tests 192 (new: the tall plan and its limits, mapping, the one drawing step), tsc, lint and build pass.
