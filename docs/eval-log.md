
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


## 2026-10-31, prompt annotate.v12: four more text cases (T8, T9, T11, T13; 12 live requests, about $0.06)
Cases, notes and expectations were written into `eval/cases-text.mjs` before the run and were not changed afterwards. The first plan named a "shipping fee" for the invoice case, but the invoice has a "Freight, Busan" line, so T13 asks for a purchase order number instead (changed before any run). T10 and T12 of the plan were not added. Raw answers: `.eval/2026-10-31-t8-t13` (git-ignored).

| Case | Note | Runs | Result |
|---|---|---|---|
| T8 (Atlas) | "The Archived badge is hard to notice." | 3 | pass 3/3, median IoU 0.93 |
| T9 (Atlas) | "The Share button does not work." (six Share buttons) | 3 | pass 3/3: `ambiguous`, no box |
| T11 (email) | "Please open the attachment that Min-jun sent and check it." (the email has no attachment) | 3 | pass 3/3: `not_found`, no box |
| T13 (invoice) | "Please check the purchase order number on this invoice." (none on the invoice) | 3 | pass 3/3: `not_found`, no box |

12 of 12 runs pass. Only 3 runs per case and the cases are easy ones for a screen with plain text, so this shows the behaviour on these four notes, not a rate.
