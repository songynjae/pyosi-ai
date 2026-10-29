# Development Log

Newest entries first.

## 2026-10-28: Milestone 4, PNG export (implemented; needs human review)
**Status: implemented on `feat/m4-export` (branched from `feat/m3-box-editing`), NOT committed.** User-approved scope: three formats, Download PNG and Copy, original image size.

- Format select next to **Download PNG** and **Copy** (default **Annotated**): *Annotated* = image + boxes + numbered badges + a description list under the image; *Boxes only*; *Original image* (no marks). The list shows every entry in list order; entries without a location get a grey number and "(location not found)" / "(location ambiguous)".
- Always drawn from the original image (never the 2x model copy): the image part keeps its pixel size, only the list adds height. Stroke, badge and list text scale with the image width (1x up to 700 px wide) so marks stay visible on large screenshots. Badges follow the on-screen rule (`badge-placement.ts`) and are kept inside the image.
- Export colors are fixed (light callout red on white list), not the page theme, so the file reads the same wherever it is pasted. Output is always PNG (a JPEG upload exports as PNG).
- Code: `lib/export-image.ts` (pure layout, wrapping, file names + a browser-only canvas `renderExport`), wired in `components/Workspace.tsx`. Download uses a blob link (`<image>-<format>.png`). Copy passes a promise to `ClipboardItem` (keeps the click's permission in Safari) and falls back to a message when unsupported or denied.
- Layout (user review): the Export row sits **below** the Annotations list, not above it. Download file names are `<image name without extension>-<format>.png` (sample: `floraday-...`, pasted image: whatever name the clipboard gives, usually `image-...`); unsafe characters and spaces become `-`, with `pyosi` as the fallback.
- User review changes: the Export section now appears only after results exist (hidden before Generate and when every annotation was deleted), as its own bordered block with an "Export" heading under the Annotations list. Labels are shown with a capital first letter in the list and the export (`lib/format-label.ts`; "iPhone"-style names are left alone; the stored label is unchanged). 91 tests pass.
- **Open issue found in user testing (Chrome toolbar strip, note: "the spacing between icons need to be reviewed. Shouldn't be 8mm?"):** the model boxed four empty gaps between icons, and the boxes drift right (about +2% of the image width at the first gap, about +4% at the last; box 3 lands on the avatar, box 4 inside the Relaunch pill). The overlay itself is correct (fixture offsets <= 0.01 px), so this is model output. Likely causes: whitespace has no visual features to ground on (the model snaps to neighbouring objects), the targets are only 3-6% of the width, the image is a very wide strip, and the prompt asks for "distinct UI elements". Also all four descriptions are the same sentence, and "Shouldn't be 8mm?" (a question) became "should be 8mm" because the v3 prompt says to state points directly. Not changed yet: it needs a prompt change and a few live requests (approval).
- Prompt `annotate.v4` (user-approved): spacing/alignment notes box the elements around the gap as one entry instead of boxing empty space; questions stay questions; no repeated descriptions; numbers and units are kept as written. **Not tested against the live API yet** (needs approved requests); only the version string test changed. The Chrome toolbar test image (724x210, not saved by the user; a new capture was shared in chat, kept out of the repo because it shows a profile photo) would be sent at 2x (1448x420).
- **v4 live check (3 requests, about $0.015, user-approved; Chrome toolbar 724x210, note "the spacing between icons need to be reviewed. Shouldn't be 8mm?", sent through the route with a script outside the repo):**

| Run | Image sent | Entries | Box (px of the original, by eye) | Description |
|---|---|---|---|---|
| 1 | 2x (1448x420, as the app sends) | 1 | x 45-403, y 25-69 | "...needs to be reviewed. Shouldn't it be 8mm?" |
| 2 | original 724x210 | 1 | x 0-715, y 1-55 (whole toolbar row incl. the Relaunch pill) | "...Shouldn't the spacing be 8mm?" |
| 3 | 2x, repeat | 1 | x 49-413, y 24-85 | "...Shouldn't it be 8mm?" |

  Reading: v4 fixed the content problems (one entry instead of four, the question stays a question, "8mm" kept, no repeated sentences) and no longer boxes empty gaps. Boxes are approximate: the 2x runs cover star to avatar (right edge 11-21 px into the Relaunch pill, run 3 about 20 px too tall); the original-size run was clearly worse, which again supports the 2x upscale. n=3 on one image; element positions were measured by eye (about 5 px).
- **Spacing feasibility spike (2 of 3 approved requests used, about $0.010; temporary script outside the repo, 2x image, same toolbar and note).** The model was asked for the two elements on either side of each gap; the gap was computed from their boxes and compared with truth measured from the PNG's pixels (icon ink: star 53-82, extensions 154-185, download 260-291, avatar 328-367, Relaunch pill from 392; gaps 72, 75, 37, 25 px of a 724 px image).

| Gap | Truth | Run 1 | Run 2 |
|---|---|---|---|
| star - extensions | 72 | 72 | 73 |
| extensions - download | 75 | 63 | 70 |
| download - avatar | 37 | 37 | 35 |
| avatar - Relaunch | 25 | 14 | 20 |

  Mean absolute error 4.5 px (0.6% of the width), worst -12 px. The 25 px gap came out 14-20 px (44% and 20% short): the model's element boxes are looser than the icon ink (the avatar box ends 15-22 px too far right, probably button padding), which shrinks small gaps. Endpoint errors reach about 3% of the width. Descriptions from the spike prompt were useless ("Shouldn't be 8mm?" on every entry), so the real prompt must be written with care. n=2 runs, one image. Conclusion: a computed gap is about as accurate as the v4 group box for position, and much better for length; usable as a starting point that the user can correct with the box editor.
- **Distance lines (B1, user-approved; implemented, needs human review).** Spacing and length notes are no longer boxes. Prompt `annotate.v5` makes the model answer with `kind: "measure"`, the one or two `elements` around the gap (or the element whose width/height is meant), an `axis` and the `value` from the notes (e.g. "8mm"). `lib/spacing.ts` computes the gap between the two element boxes (`gapBetween`); no gap (overlap, touching, diagonal) still gets a short marker (1.5% of the image) centered between the facing edges (`markerBetween`, see the decision below); unusable elements are reported as invalid, never repaired. The result is stored as an ordinary `box` plus `kind: "measure"`, `axis` and optional `value` (schema, `lib/types.ts`), so selection, move, resize, delete and text editing work unchanged; the box is the measured span (its width or height is the distance).
  - Screen and export: a line along the axis through the middle of the box, a cap at each end (at most 28 px at scale 1), the value in a small white label on the line, and the numbered badge above (below near the top edge), never on a corner. The list shows a "Distance <value>" tag. Geometry is pure and tested (`measureMarks`, `gapBetween`).
  - Tests: 20 new (111 pass in total), plus `tsc`, `lint`, `build`. Browser check with a stubbed API (0 real calls): horizontal and vertical lines with labels on screen, and the exported PNG (2048x1440 annotated) draws the same.
  - **Decision after the first user test (user): an identified gap is always annotated, and no measured number is ever shown.** In that test the 4th gap became a big box because the model's two element boxes overlapped (the earlier fallback was one box around both, which contradicted the "distance" description). Now any gap between two identified elements gets a marker; when the exact gap cannot be computed it is a short marker between the facing edges that the user can move or stretch. The user also pointed out that a pixel distance from a screenshot is not the number people care about (real UI units differ), so the only text on a marker is the value from the notes (e.g. "8mm"); we do not display a computed distance. No new status ("unmeasurable") was added. Tests: 116 pass. Not verified visually yet.
- **Badge overlap fix (user-approved):** numbered badges that would cover each other are separated (`lib/badge-layout.ts`, `separateBadges`): the earlier entry keeps its place, the later one moves up by one badge (26 px at scale 1), or down when there is no room above (never outside the image). Applied on screen (the overlay measures its own pixel size and sets a vertical offset per badge) and in the PNG export (same rule at the export's pixel size, so the two can differ slightly). Prompt v6 (tighter element boxes) was not started at the user's request. Tests: 121 pass, plus `tsc`, `lint`, `build`. Browser check with a stubbed API (0 real calls): three distance markers 3% apart plus a box: badge 3 moved up, every pair at least 34 px apart (badge 24 px); the exported PNG showed no overlap. Not verified: very crowded images (more than 3 badges close together), dragging a box while badges are separated.
- **User review (Safari/Chrome):** Copy works in Chrome and Safari (confirmed by the user). Safari shows its own "Allow downloads on localhost?" prompt the first time Download PNG is used: the PNG is drawn asynchronously after the click, so Safari treats the download as script-initiated. Expected and one-time per site; pre-drawing the PNG before the click would likely avoid it (not done, not testable here).
- **Root-cause analysis of the persistent distance-line offsets (same image, same prompt, markers always right of and below the real gaps).** Checked offline, no new requests: (1) the app's math is not the cause: the saved raw model boxes from the 2 spike runs, fed through `measureFromElements`, give exactly the same pixel positions as a hand computation. (2) The raw boxes are biased in a stable way, measured against pixel truth (8 element boxes, mean signed error in px of the 724x210 original): left +2.1, top +3.5, **right +9.2, bottom +20.7**. Bottom edges are +20 to +22 in every case (the boxes stretch to the bottom of the toolbar row), right edges drift with x (+1 for the star at x=82 up to +15..+22 for the avatar at x=367, about +3 to +5%), left and top are close. So the error is systematic, not random, and it is already in the model's output. (3) Our derivation amplifies it: a gap is the difference of two noisy edges. Hypotheses, not confirmed: the model's coordinate frame is slightly off for an extreme aspect ratio (this strip is 3.45:1; every case that worked well so far was at most about 2:1 or tall), or its element boxes are looser than the visible glyph. Needs a controlled test (known synthetic boxes at different aspect ratios, a padded strip, a larger upscale) with approved live requests.
- **Root-cause experiments (4 approved requests, about $0.02; scripts and test images outside the repo; the toolbar is 724x210 = 3.45:1, sent at 2x).** Same prompt per pair, per-edge error in px of the 724 px original against truth measured from the pixels (mean over elements):

| # | Image | Frame | L | T | R | B |
|---|---|---|---|---|---|---|
| E1 | synthetic: 4 dark squares + a pill, known boxes | 1448x420 (3.45:1) | -4.4 | +0.3 | -2.9 | +4.7 |
| E2 | same, centered white padding | 1448x724 (2:1) | -8.8 | +13.3 | -3.6 | +14.3 |
| E3 | real toolbar, 5 elements | 1448x420 (3.45:1) | +4.0 | +2.4 | +4.5 | **+19.8** |
| E4 | same, centered white padding | 1448x724 (2:1) | -2.2 | **+12.9** | +2.0 | +15.2 |

  Findings: (1) the app's math is exact (offline check), so the offsets come from the model's boxes. (2) In the wide frame the real icons' boxes are about 18 px too tall (T +2, B +20) and the avatar box is shifted about 14 px right (L +14.5, R +13.1); the clean synthetic shapes are much closer (heights +4), so part of the error is how the model reads real toolbar items. (3) Padding to 2:1 fixes the heights (B-T about +3) and the horizontal errors (all within about 3 px, avatar -1.5/+2.2): the four gap centers come out within 1 px of truth (117.7/222.2/310.2/380.1 vs 118/222.5/309.5/379.5; E3: up to +8 and +10 px off for gaps 3 and 4) and gap lengths 3-6 px short. (4) Padding introduces a constant vertical translation of about +13 px (T and B shift together, same for the synthetic and the real image), so the vertical position of a line is about 12-14 px low in both frames (E3 +11, E4 +14 at the box centers). So the aspect-ratio hypothesis holds for the horizontal errors and the tall boxes, not for the vertical offset. Untested: whether the vertical shift depends on where the padding goes (below only), whether it holds on other images, other aspect ratios.
- **White padding for very wide images (user-approved; implemented).** Images wider than 2.5:1 are sent with white padding up to 2:1 (centered), in the same drawing step as the 2x upscale (`prepareImage` in `lib/upscale.ts`, plan and mapping in `lib/pad-aspect.ts`). The model's boxes are mapped back to the original image before validation (`mapAnnotationsFromPadded`), so the preview, editing and export never see the padding. Normal and tall images are untouched (tall was not tested). A box the model puts in the padding maps outside 0-100 and is reported as invalid, never clamped. Any failure falls back to the original file.
  - Tests: 13 new (134 pass in total), plus `tsc`, `lint`, `build`. Browser check with a stubbed API (0 real calls): a pasted 724x210 strip was sent as `strip-padded-2x.png` (1448x724); padded-frame boxes came back at the original positions to within 0.01% of the image.
  - First version centered the padding; see "Vertical shift" below, which changed it to padding below only.
- **Vertical shift (user-approved experiments, 4 of 5 requests used, about $0.02) and prompt v6.** Same toolbar, same prompt (the five elements named), padded to 2:1 in 3 layouts, mean edge errors in px of the original: centered (E4) T +12.9 / B +15.2; **padding below only (V1) L -1.4, T -0.5, R +1.6, B +1.3 (every edge within 2.7 px)**; padding above only (V2) T +13.1 / B +15.7. So the +13 px shift is caused by padding ABOVE the image, and padding below only removes it. The layout was changed to below-only (`offsetY: 0`, tests updated: 134 pass, `tsc`, `lint`, `build`; browser check with a stubbed API: a pasted 724x210 strip was sent as 1448x724 and a padded-frame box came back at its original position to 0.01%). A user test with a different strip (ChatGPT sidebar, centered padding) had no visible vertical shift, so the shift is probably image-dependent too; below-only was not re-tested on other images.
  - Prompt `annotate.v6` adds: give an entry for every gap between neighbours in a group, and count buttons and avatars as items. Live through the route with the below-padded 2x toolbar and the same note, boxes mapped back with the app's own code (2 requests): both runs returned all 4 gaps (v5 gave 3). Gap x positions vs truth (82-154, 185-260, 291-328, 367-392): run 1 85-155, 193-261, 300-334, 375-386; run 2 84-155, 193-260, 307-340, 384-405. So the first two gaps are within about 8 px, the right-hand ones drift right by up to about 17 px, and the line height is about 7 px low (y range 28-73 instead of icon centers near 43: the element boxes still extend to y 72-78 where the icons end at 57-63). The experiment prompt (which named the five elements) gave much tighter boxes than the app prompt (which lets the model pick the elements and asks for pairs), so how the elements are requested matters. Not tried: asking for the whole row of elements once and deriving every gap in code; needs a design decision.
- **Row-of-elements experiment (user-approved, 3 requests, about $0.015; script outside the repo; same note as the user's test).** Instead of asking for a pair of elements per gap, the model was asked once for every item of the group the notes refer to ("a row or a column, buttons and avatars count as items", tight boxes, no element names given), and the gaps were derived in code between consecutive items. Errors in px of the original against pixel truth:

| Run | Image | Items returned | Gap start errors | Gap end errors | Gap length (truth 72/75/37/25) |
|---|---|---|---|---|---|
| R1 | toolbar, padded below, 2x | 5 (star, puzzle, download, avatar, Relaunch) | +3.4 +2.5 +2.2 +1.5 | -5.6 -2.3 -0.8 -6.8 | 63 / 70 / 34 / 17 |
| R2 | same, repeat | 5 | +3.4 +4.7 +8.7 +2.2 | -4.9 -3.0 -1.5 -2.5 | 64 / 67 / 27 / 20 |
| R3 | Floraday 2048x1124: card and bottom button | 2 | -2.4 | -4.7 | 43 (truth 45) |

  Compared with asking for pairs per gap through the app (v6, two runs): right-hand gaps drifted right by up to 17 px and the first two were within about 8 px; with the row every gap edge is within 8.7 px (mean about 3.5 px), the Relaunch button is included, and Floraday's vertical gap is within 5 px. Gaps come out 3-10 px short in length (the model boxes are slightly looser than the glyphs). Icon heights were loose in R1 (bottoms +15 px) and tight in R2 (+1.4 to +2.7 px), so the line height can still be about 7 px low on some runs; the Relaunch box bottom is about +15 px in both toolbar runs (it does not affect the line, which uses the overlap of the two neighbours). n = 2 runs on one strip, 1 run on Floraday. Not built yet: the notes may refer to a single gap, so the response must also say which gaps of the row are meant (design decision pending).
- **Row-of-items design implemented (user-approved), prompts v7 and v8.** The model now returns, once, a top-level `groups` list (one row or column per group: id, axis and EVERY item with a unique label and a tight box) and each measurement entry names the two items its gap lies between (`between`, by label) or the one item whose width/height is meant (`of` + `axis`); `resolveMeasure` in `lib/spacing.ts` computes the marker (`markerBetween` for gaps, so overlapping boxes still give a short marker). The old per-entry `elements` pairs are gone. An entry that points at nothing usable is reported as invalid, never repaired. Plain boxes and old responses without `groups` still work. Tests: 136 pass, plus `tsc`, `lint`, `build`.
  - Live checks (2 approved requests, about $0.01, through the app route, boxes mapped back with the app's code): (1) **v7**, toolbar padded below, the user's note: 5 entries, no invalid. Gap x vs truth (82-154, 185-260, 291-328, 367-392): 85-153; 194-218 and 228-259 (the model counted the thin divider between the puzzle and the download icon as an item and split one gap in two); 298-335; 378-389. Errors up to about 11 px, line about 6 px low (y 27-72). (2) **v8** (adds: thin dividers and separators are not items), Floraday with "The result card and the bottom button is too close.": the model answered with two plain boxes (card and button) with correct positions, not a distance line, although earlier runs with v5/v6 gave a distance line for similar notes. So the single-gap path with named items was **not exercised live**, and the divider fix is **unverified**. Open question: whether "too close / too narrow / too wide" notes reliably produce measurement entries (needs more requests, n=1 each).
- **Prompt v9 live checks (user-approved, 3 requests, about $0.015; through the app route, boxes mapped back with the app's code).** v9 spells out that wording about space or size ("too close", "too far", "too tight", "too narrow", "too wide", "too tall", "too short", spacing, gap, padding, margin, a number with a unit) is a distance note and gets a measurement entry, not boxes.
  - Toolbar (padded below, 2x, the user's note): **4 entries**, no divider split, no invalid. Gap x vs truth (82-154, 185-260, 291-328, 367-392): 84-153, 188-259, 294-328, 369-385, all within 7 px. The line height is still about 6 px low (y 27-72, icon centers near 43).
  - Floraday "The result card and the bottom button is too close.": one **vertical distance** entry, y 976-1019 vs truth gap 978-1023, x 883-1169 (the button's width range, as in the truth).
  - Floraday "The result card is too narrow.": one **width** entry (`of` + horizontal), x 551-1501 vs the card's 550-1502.
  - Reading: with v9 the three kinds of notes produced distance markers once each (n=1 per case; model output varies between runs), v8 had given plain boxes for the "too close" note. Not tested: notes that mix boxes and distances, columns (vertical groups) with several items, non-English notes.
- **User test that failed (Korean note on a column of icons: "check the spacing between the icons? and review the Audio icon with another image"; image with Image / Audio / Segment).** The app showed one box (Audio icon) and "2 invalid annotations were skipped: a "found" annotation requires a box". The two skipped entries are most likely the two vertical gaps (Image-Audio, Audio-Segment): measurement entries that `resolveMeasure` could not resolve (unknown group id or item name, or missing groups). The raw response was not kept, so the exact cause is unknown. Vertical groups and Korean notes were on the "not tested" list. Fix: unresolved measurements now say why in the invalid message (`explainMeasureProblem`), so the next run shows the cause. The exported PNG showed the same single annotation as the page; the only thing it does not show is the skipped-entry warning. A structured test plan and procedure draft is in `docs/test-plan.md` (not approved yet).
- **Prompt v10: description wording (user decision: polite formal Korean 합니다체, labels in the notes' language).** The user found the on-screen descriptions unnatural: plain "~이다/한다" endings, a first sentence that only says what the element is, English labels next to Korean text, notes' wishes turned into obligations ("해봤으면 좋겠어" -> "검토해야 한다"), and doubled or awkwardly copied questions in English ("Are they in the correct location?"). v10 asks for: the notes' language for label and description (names shown in the screenshot stay as shown, e.g. "Audio 아이콘"), 합니다체 for Korean, the notes' tone kept (wish, question, requirement), natural wording instead of copying awkward phrases, one short sentence, no repeating the label and no doubled questions. Tests: 136 pass, plus `tsc`, `lint`, `build`. **Not yet checked with the live model** (needs approved requests).
- **v10 live checks (user-approved, 2 requests, about $0.01; through the app route).**
  - Korean note on the toolbar (padded below, 2x): "각 아이콘 간 스페이싱 치수 확인해줄래? 그리고 Relaunch 버튼도 다른 화면에서 한 번 검토해 봤으면 좋겠어." 5 entries, none invalid: four distance markers ("별 아이콘과 퍼즐 아이콘 사이의 스페이싱 치수 확인이 필요합니다." etc., 합니다체) and a box for the Relaunch button whose description keeps the wish ("다른 화면에서 검토해 보면 좋겠습니다."); the label keeps the screenshot's text ("Relaunch to update 버튼"). So Korean notes do resolve for a horizontal row. Remaining issues: the four distance labels are generic ("아이콘 간 스페이싱 1" to "4"), the box entry came first although the notes mention it last, and the right-hand gaps drifted right again in this run (gap x 85-156, 195-267, 307-341, 390-409 vs truth 82-154, 185-260, 291-328, 367-392: up to 23 px; the Relaunch box x 409-723 vs 392-709), so position accuracy still varies between runs (v9 run: within 7 px).
  - English note on Floraday: "The result card and the bottom button is too close. I'd like the button to be a bit larger if possible." 2 entries: a vertical distance (y 976-1019 vs truth gap 978-1023, "The gap between the result card and the bottom button is too close." - correct but "gap is too close" reads slightly off) and a **width** marker for the button ("The bottom button would be better if it were a bit larger.": the wish is kept, but "larger" was turned into a horizontal distance line, which says nothing about height).
- **Pixel-edge snapping of distance lines and badge beside vertical lines (user-approved 2026-10-28; no live requests used).** Because the model's positions vary between runs (up to about 23 px, line height up to 19 px low), `refineMeasure` in `lib/refine-gap.ts` snaps a gap marker to the real empty stretch between its two neighbours in the original image, and its cross position to where both neighbours actually are. It runs in the browser after the response (`loadPixels` in `lib/pixels.ts`, `refineAnnotations` in Generate), only for distance markers, and keeps the model's values unless: the area has a plain enough background (background = median colour, "ink" = more than 30 away in a channel), the chosen stretch is flat, both neighbours are clearly there (at least 4% ink beside the gap), the marker does not span an element, and the end moves at most max(24 px, 60% of the marker). Thin dividers are merged over.
  - Offline check against the toolbar's pixels with 16 saved model outputs (4 runs x 4 gaps; truth measured from pixels): 14 of 16 markers snapped; mean edge error (both ends summed) 11.1 px -> 4.0 px; mean error of the line's height 8.0 px -> 1.5 px; every snapped edge within 2 px of truth except one (4 px). Two gaps were kept unchanged (the avatar-to-pill gap, once, and one gap whose model marker was too far off). **Caveat: the thresholds were tuned on this same image**, so this is not an independent test.
  - Floraday's card-to-button gap (white card on a near-white page): first version snapped wrongly (y 986-1050 vs truth 978-1023); the neighbour and shift guards now keep the model's values there.
  - Tests: 149 pass (13 new), plus `tsc`, `lint`, `build`. Browser check with a stubbed API (0 real calls): a model marker shifted 30 px right and too tall snapped to the exact gap of a synthetic image (x 160-340, y 120-180); two vertical markers between stacked squares snapped between them with the badge beside each line, covering nothing.
  - Badge: a vertical distance line now has its numbered badge beside the line (`"right"` placement in `lib/badge-placement.ts`, screen and export). Lengths (width/height of one element) were declared out of scope by the user: the gap is the message.
  - Not verified: other real UIs (dark mode, gradients, cards on a similar background, photos), very large images (more than 16 megapixels are skipped), the app end to end with the real model.
- **Live check of v5 (the last of the 3 approved requests, about $0.005; Chrome toolbar at 2x, same note):** 3 distance entries (not the 4 gaps), each with its own description, `axis: horizontal` and `value: "8mm"`; the question stays a question. Positions (percent of the 724 px width; truth from pixels): gap 1 truth x 11.3-21.3 vs 11.8-22.8 (good); gap 2 truth 25.6-35.9 vs 28.5-39.5 (about 3% right); gap 3 truth 40.2-45.3 vs 44.7-50.2 (about 4.5% right, it lands on the avatar); the avatar - Relaunch gap was not returned. So the position error on small gaps is still there in this run (n=1), unlike the 2 spike runs, which differed in prompt and schema; the response took 5.9 s (the spike runs 1.4-2.4 s). Not yet known whether this is variance or the longer v5 prompt.
- Brief updated (`docs/product-brief.md`): basic editing and PNG export are in scope; adding boxes and moving badges stay out.
- Tests: 18 new in `tests/export-image.test.ts` (88 pass in total), plus `tsc`, `lint`, `build`.
- Browser check with a stubbed API (0 real calls): all three formats downloaded with the right names; sizes 2048x1124 for Boxes only and Original (the original size, not 2x) and 2048x1499 for Annotated (list adds 375 px); the Annotated image was inspected visually (corner badge, badge above a small box, wrapped long description, grey entry without a location).
- **Copy could not be verified:** the built-in browser denies `clipboard-write` (even a 4x4 test canvas fails with `NotAllowedError`), so only the failure message ("Couldn't copy the image. Use Download PNG instead.") was seen. Needs a real Chrome/Safari check.
- Not verified: very large images (canvas limits), dark-mode preview vs the fixed export colors, many/long annotations, non-ASCII text rendering of the list font, JPEG input.

## 2026-10-28: Annotation text editing (user-approved; added to M3)
**Status: implemented on `feat/m3-box-editing`, NOT committed.** User chose text editing now and badge dragging after export (the badge position needs a new schema field, and export has to draw it).

- Each list entry has an **Edit** link: label and description become fields with Save / Cancel (Escape cancels). Works for every status, including `ambiguous` and `not_found`.
- Label can't be empty (schema requires it; Save is disabled with a message). An empty description is allowed. Both are trimmed (`setAnnotationText` in `lib/box-edit.ts`). Edits live in React state only; Generate replaces them.
- Clicking an entry that has a box selects that box on the image, and the selected entry is highlighted.
- Tests: 2 new (70 pass in total), plus `tsc`, `lint`, `build`. Browser check with a stubbed API (0 real calls): list click selects the box, edit and Save update the entry, Save is disabled for a blank label, Escape cancels.
- Not verified: how the editor looks on narrow screens and with long text.

## 2026-10-28: Milestone 3, basic box editing (implemented; needs human visual review)
**Status: implemented on `feat/m3-box-editing`, NOT committed.** Scope (user-approved): move, resize and delete only. Add-box and description editing are out.

- Click a box to select it (dashed outline, 8 resize handles; boxes under 10% in either direction get corner handles only). Drag the box to move, drag a handle to resize. Pointer events, so mouse, touch and pen share one path (`components/AnnotationOverlay.tsx`, `touch-action: none`).
- The drag math is a pure module, `lib/box-edit.ts` (`applyDrag`, `setAnnotationBox`, `removeAnnotation`): always computed from the box at drag start, clamped to the image, minimum 1% per side (a box already smaller keeps its own size as the floor). The result always passes `BoxSchema`.
- Delete removes the whole annotation (list entry included) with the Delete/Backspace key (ignored while typing in a field) or the "Delete annotation" link under the image. No confirmation, no undo. Numbers follow list order, so later boxes shift up by one.
- Edits live in React state only. Generate (and a new image) replaces everything, with no warning (user decision).
- Only `found` boxes are editable; `ambiguous` and `not_found` entries stay list-only.
- Tests: 15 new in `tests/box-edit.test.ts` (68 pass in total), plus `tsc`, `lint`, `build`.
- Browser check with a stubbed API (0 real calls): selected, moved, resized (se handle) and deleted a box with real mouse drags and the Delete key; the list renumbered.
- Not verified: touch devices, Backspace while the notes box is focused (guarded in code, not exercised), very small boxes, overlapping boxes, feel of the drag.
- Fixed (user-approved): boxes with the corner badge get no top-left resize handle, so the number stays visible; that corner is reached with the top and left handles. Small boxes (badge above or below) keep all four corner handles.

## 2026-10-29: M5 baseline measurement (prompt v10, current build; harness in `scripts/eval.mjs`)
**Status: harness and 10 demo cases built; baseline run done (50 live requests, about $0.25); fixes not started. Not committed yet.**

- Harness: `npm run eval` (dry run by default; `--send` for live requests; `--replay <dir>` scores saved raw responses for free). Cases in `eval/cases.mjs` with truth measured from pixels; private images (toolbar, Meta sidebar) stay in `.eval-private/` (git-ignored); raw responses go to `.eval/<date>-<prompt>/`. The harness reuses the app's own code (request, parse, mapping back, validation, pixel snapping). Checked offline first with replayed responses (synthetic answers shifted by 10 to 14 px were snapped back to 0%).
- **Baseline: 28 of 50 runs pass (56%)** against the draft bar (90% overall, 80% per demo case). Per case (5 runs each): D1 toolbar 4/5, D2 icon list 0/5, D3 Floraday gap 5/5, D4 Floraday box 5/5, D5 non-existent element 0/5, D6 synthetic row 4/5, D7 synthetic list of 8 items 0/5, D8 box plus gap 0/5, D9 PCB drawing 5/5, D10 mounting plate 5/5. No run produced an invalid entry.
- **What the failures are (from the raw responses):**
  1. D5 (5/5 fail): for "the Refresh button is too far from the title" (no such button) the model measured to the existing "Choose Another Sky" button instead of answering not found. A false claim, in every run.
  2. D8 (5/5 fail): "the photo is too large" came back as a distance line (the photo's height) instead of a box; the v9 wording ("too large/narrow/tall...") makes size notes become distance lines. The owner decided lengths are out of scope; only the gap should be a line.
  3. D7 (5/5 fail): with 8 items in a tall list the model located only 2 to 4 of the 7 gaps correctly (others put on an item or shifted by 40 to 60 px); the snapping limit (24 px) cannot repair that. A 5% cross error was partly my truth definition (the row also holds label bars); fixed in the case (`crossRange`).
  4. D2 (5/5 fail): the plain box for the Audio icon is about 22 px too high (box accuracy of the model, not snapped); repeated identical descriptions in some runs; one gap about 5% off.
  5. D1 (1/5) and D6 (1/5): one run left out the last gap, one put a gap on the next square.
- **Passing:** the two hardware drawings (D9, D10), the Floraday cases (D3, D4) and most of the toolbar and synthetic row: the distance lines are exact whenever the model puts the marker near the right gap and the pixel snapping applies.
- **Tried and reverted (replayed on the saved baseline, no cost):** removing the "marker spans an element" guard (no change) and taking the most common colour instead of the median as background (no gain, D9 got worse). Neither is kept; the committed snapping is unchanged. Found while doing so: the median background estimate can be pulled towards a large pill-shaped item, which is why the toolbar's last gap (next to the Relaunch pill) is sometimes not snapped.
- Meta API: the documentation search confirms `reasoning_effort` ("none" is rejected) but did not show whether `temperature` or `seed` are accepted; to be tested with one small request.
- Next (needs approval): prompt changes for items 1 and 2 (and unique descriptions), then re-run D1, D2, D5, D7, D8 three times each (about $0.075), and one small test of `temperature: 0`.

## 2026-10-29: Evaluation criteria brought in line with the M5 plan (baseline re-scored, no new requests)
**Status: implemented on `fix/eval-criteria`, not committed.** The first harness only decided pass or fail per run (presence, kind, worst gap error, wording rules); the plan's per-case criteria (median gap-edge error at most 1.5%, same entry count in at least 4 of 5 runs) were shown in the table but did not decide anything, and "numbers and units kept as written" was not checked. I should have said so when I reported the baseline. Now `caseVerdict` applies them, `unitsNotKept` checks numbers with units, and the CLI prints a per-case OK/FAIL and a final "bar met / not met". Re-scoring the saved baseline (free): still 28 of 50 runs pass (56%); the new checks changed no run's result, but D7 now also fails the median-error rule (5.3% against 1.5%). 6 of 10 cases meet the bar (D1, D3, D4, D6, D9, D10); D2, D5, D7, D8 do not. The plan document now lists the 10 cases and how each criterion is applied.

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
