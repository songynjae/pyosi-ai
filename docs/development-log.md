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

## 2026-10-30: Demo-path check, drafts for the video and the form, repository preparation (41 live requests, about $0.205)
**Status: LICENSE, README and `CLAUDE.md` merged (PR #15); `docs/video-script.md`, `docs/submission-answers.md` and `scripts/export-demo-images.mjs` are drafts for the owner's review.** Total of the day's live requests: 41 (5 on the deployment, 36 here), within the $1 budget.
- Pre-publication review (read-only): no API key, access code or token in the tracked files or in the whole history (0 hits for the real values); no email addresses or phone numbers in tracked files; only `app/favicon.ico` and `public/fixtures/floraday.png` were ever tracked as images; the commit author address `songynjae@gmail.com` appears in 30 commits (GitHub's noreply address in 15); the development log names third-party pages used for testing (a Google search page, the Cursor editor, a Chrome toolbar) without images; `feat/gap-to-next` and one stash exist only on the owner's machine.
- Demo-path check, 3 runs each, prompt v12, same code as the app: D3 3/3, D4 3/3, D6 3/3, D9 3/3, D10 3/3 (edge error at most 0.2%); ContextMark CM1, CM2, CM6, CM7, CM10 3/3 each (median IoU 0.93, 0.93, 0.98, 0.97, 0.96; the small button boxes of CM1 and CM2 are less exact: 67% and 50% of the boxes reach 0.7); D8 3/3. **D5 (a Refresh button that does not exist) 2/3:** in one run the model drew a distance line to another element instead of answering "not found"; so the video's "not found" scene uses the CM3 note on a cropped screenshot (5/5 earlier), not D5. Raw answers: `.eval/2026-10-30-demo*` (git-ignored).
- `scripts/export-demo-images.mjs` writes the four synthetic images (D6, D7, D9, D10) to `docs/demo-assets/` (drawn by code, no real data).
- Deployment check at the end of the day (`https://pyosi.netlify.app`, after PRs #14 to #16): page 200; no code 401; the judges code with an empty form 400; a 4.3 MB upload refused with the app's 413 message; one real Generate on the Floraday screenshot answered in about 4.5 s (annotate.v12, one entry). Live requests of the day: 42 (about $0.21 of the $1 budget).
- Left for the owner: the evening decisions listed in the summary of this session (making the repository public on Monday, the video, the form fields marked [owner], the beta, the Netlify badge, the author address in the history).

## 2026-10-30: Plural references on text screens: "all the delivery dates", "every unit price" (12 live requests, about $0.06; the day's total 81 requests, about $0.41)
**Status: measured; no code, prompt or app change. Why:** the review of the user interviews found that the cases where Pyosi should help most (several similar things at once, which cost the most to draw by hand) were the ones measured weakest (ContextMark CM9 "the card icons", the 8-item list). The text mock screens (`eval/fixtures/text/`, new truth markers added for the repeated items; the old truth boxes and PNGs are byte-identical) give a cleaner test. Cases in `eval/cases-plural.mjs` (`npm run eval -- --set plural`), prompt v12, 3 runs each; raw answers `.eval/2026-10-30-plural`.

| case | note (no count given) | marked the right 3 items | all 3 within IoU 0.5 | median IoU | strict harness |
|---|---|---|---|---|---|
| P1 purchase order | "Highlight all the delivery dates." | 3 of 3 runs | 3 of 3 | 0.88 | 2/3 (wording: repeated description) |
| P2 purchase order | "Highlight every unit price." | 2 of 3 (the third drew one box around the whole column) | 2 of 3 | 0.88 | 2/3 |
| P3 invoice | "Highlight all the line amounts." | 3 of 3 | **0 of 3** | 0.05 | 0/3 |
| P4 chat | "Highlight all of Anna's messages." | 3 of 3 | 3 of 3 | 0.98 | 2/3 (wording: repeated description) |

- **Reading:** on text screens the model finds all the items of a kind in 11 of 12 runs and puts a box on each; this is better than the earlier "plural is weak" reading, which came from icon sets (CM9) and a long list (D7). Position: 8 of 12 runs have every box within overlap 0.5.
- **P3 is a vertical offset, not a wrong element:** in all three runs the boxes sit about 14 px below the real amounts (for example y 171 to 190 for text at y 157 to 174 in an 800 px high image) and some boxes run to the edge of the column; the same model was exact on the other screens (1 to 2 px). Boxes of 17 px height have no tolerance for a 14 px shift, so the overlap is near zero. It is image-specific (a table with small text), repeatable, and is the same kind of offset as earlier distance-line offsets.
- **P1 and P4 "fail" only on the wording rule** "repeated description": the three entries get near-identical descriptions because the user asked for the same thing three times; the prompt says to write one entry instead of repeating a point, which fits plural requests badly. Not changed.
- **P2 run 3:** one box around the whole price column ("UNIT PRICE values") instead of three boxes: the group-box habit seen with "the card icons".
- Limits: four cases on three mock screens (fake data), English, 3 runs; the interviewees' real documents are not covered.

## 2026-10-30: Why the export has three formats (written down afterwards; the rationale was not recorded when M4 was built)
**Status: the M4 entry only says "user-approved scope: three formats". The reasons below are Claude's reading, not interview evidence; they are hypotheses.**
- *Annotated* (the default): the marked image plus a short explanation per mark under it. Needs no other text: the numbers are explained inside the picture. Use it when several marks are sent without a message of your own, or for a ticket or a review.
- *Boxes only*: the marked image without the list, to send next to your own message (the owner's message-first idea of 2026-10-30). The numbers stay on the image; Pyosi decides which number is which, so with several marks you look at the picture and write (1), (2) in your message yourself; with one mark nothing is needed. Making Pyosi write the numbers into your message is a post-MVP idea.
- *Original image*: the unmarked screenshot at its original size. Reasons that can be stated: a pasted screenshot has no file, so this gives one; a recipient may want the clean picture next to the marked one; and it was used while building the evaluation cases (the owner exported the Image/Audio/Segment screenshot with it, `docs/m5-plan.md`). None of the user interviews asked for it; it is cheap to keep and is not shown in the demo.

## 2026-10-30: The number badge no longer sits on the first letter of a one-line text box (owner's decision; app change)
**Status: implemented and tested locally on `fix/badge-over-text`; waiting for the owner's approval to commit and merge.** Found by the owner in a local run on a wide marketing page: the badge of a one-line "Disclaimer: ..." box covered its first letter on screen and in the export. Cause: the badge goes on a box's top-left corner unless the box is under 10% of the image's height or width; a line of text in a wide image is about 12% of its height (5% of its width), so it got the corner badge, while the badge is sized by the image's width.
- `lib/badge-placement.ts`: `badgePlacement` takes the image's aspect (height / width) and measures the box height in percent of the width when that is smaller, so one line of text in a wide screenshot counts as small and the badge goes above it (below near the top edge). Without the aspect, nothing changes; tall images and big boxes (a card of 46% x 69%) keep the corner badge. Callers: the overlay and the export (`lib/export-image.ts`) pass the aspect, so the screen and the PNG agree.
- Test added (186 pass), `tsc` and `lint` pass; in the browser a mock wide page with a 39% x 11% text box shows the badge above the box and the text fully visible.
- Side effect to know: in wide images, boxes about 8% to 15% of the height (a table row, a short banner) now get the badge above them instead of on the corner. The badge is centered above the box, so on a very wide box it can sit over text of the line above.
- Not done: moving the badge outside the left edge for wide text boxes (a new placement), a format without numbers ("Marks only"), and making "Boxes only" the default export: post-MVP.

## 2026-10-30: Message-style notes (full messages with a greeting) and the new narrative (15 live requests, about $0.07; the day's total 69 requests, about $0.35)
**Status: measured; no code, prompt or app change. Docs rewritten around the owner's narrative: *Pyosi identifies the part of a screenshot you are talking about, and marks it* (`docs/video-script.md`, `docs/submission-answers.md`, the README opener).** Why: the owner's reading of the interviews is that people usually send the screenshot and a message separately, so the value is to find which part the message refers to, not to write annotations; the existing measurements used short rough notes only. Cases in `eval/cases-message.mjs` (`npm run eval -- --set message`), prompt v12, 3 runs each; raw answers `.eval/2026-10-30-message` (git-ignored).

| case | message | result |
|---|---|---|
| M1 Floraday | greeting, the lily card and the button, "before Monday" | 2 completed runs (the third: HTTP 502), both targets found, median IoU 0.99 |
| M2 Floraday | one button among remarks that need no mark ("sign-in worked well") | 3/3, only the button marked, 0.91 |
| M3 purchase order | date and unit price of line 2 | 3 runs, both found, nothing extra, 0.84 |
| M4 email | the quantity and the date mentioned | 3 runs, both found, loose boxes on 18 px phrases, 0.72 (67% of the boxes reach 0.7) |
| M5 chat | "the message where she confirms the price" plus "the discount she promised" (not in the chat) | 3 runs, message found (0.98), the discount reported "not found" every time, never boxed |

- Strict harness verdict 6 of 15, but all 9 failures are one wording rule: the message ends with a polite question ("Could you check both before Monday?") and the descriptions restate it as a need ("needs to be checked before Monday"); the rule counts that as a question that was not kept. The harness was not changed after seeing the answers; the position of the marks is the question of this set and it was right in all 14 completed runs. Whether such a request should stay a question is a wording decision for the owner.
- Descriptions kept the message's own points ("needs confirmation today", "higher than agreed"), and for M5 read the price from the screenshot ("USD 12.40 per unit").
- Limits: five cases on three screens, English only, 3 runs, fake data; the 502 is a model API error (about 1 in 15 here, 3 timeouts in 60 earlier).

## 2026-10-30: Text-heavy screens: small text areas (a date, a price, a quantity) (12 live requests, about $0.06; the day's total 54 requests, about $0.27)
**Status: measured; no code, prompt or app change. Why:** the sales professional of the user interviews marks dates, prices, quantities and earlier agreements, and none of the measured cases had small areas of text; the interviewees' real work screens cannot leave their companies, so the screens are mock-ups with fake data (`eval/fixtures/text/*.html`, rendered by `scripts/make-text-fixtures.mjs`; the truth boxes are read from the page: `eval/fixtures/text/truth.mjs`). Cases in `eval/cases-text.mjs`, run with `npm run eval -- --set text`; 3 runs each, prompt v12; raw answers `.eval/2026-10-30-text` (git-ignored).

| case | what | pass | median IoU | share of boxes with IoU 0.7 or more |
|---|---|---|---|---|
| T1 | purchase order: delivery date and unit price of line 2 (two table cells, 68 x 17 and 89 x 17 px) | 3/3 | 0.85 | 100% |
| T2 | email: "14 March" and "500 units" inside a sentence (65 x 18 px each) | 3/3 | 0.60 | 17% |
| T3 | chat: the message that confirms price and delivery (560 x 40 px) | 3/3 | 0.98 | 100% |
| T4 | invoice: the total amount due | 0/3 | 0.30 | 0% |

- **T4 is mostly my truth definition:** the truth is the amount "USD 7,447.00" only; in all three runs the model boxed the whole line from the label "Total due" to the end of the amount (x 715 to 1045; the vertical extent and the right edge are exact). The note "highlight the total amount due" can be read either way, so this is not counted as a clear model failure, and the truth was not changed after seeing the answers.
- **T2:** the position is right; the sides are loose by 4 to 20 px on boxes that are only 18 px high, which gives overlaps around 0.6 (all above the 0.5 hit threshold, few above 0.7).
- **Reading:** for a named table cell or a whole message the boxes are tight (median IoU 0.85 and 0.98); for a phrase inside a sentence they are positioned correctly but loose; a note that can mean a label plus its value gets the wider box. The measurement does not support promising pixel-tight boxes around single words.
- Limits: 4 mock screens, one rendering each (1200 x 800, 2x upscaled by the harness), English only, 3 runs; real documents (scans, dense spreadsheets, other fonts) are not covered.

## 2026-10-29: Deployment checked on Netlify, and a hard cap on all model requests (live requests: 2, about $0.01)
**Status: the deployment works; the hard cap is implemented and tested locally on `feat/budget-cap`, not merged, not tested on Netlify yet.**
- Netlify (`https://pyosi.netlify.app`, deployed from `main`): the page loads with the new UI; no or a wrong code gives 401; the judges code reaches the normal checks; 3.9 MB reaches the app (415 for a non-image), 4.3 MB gives the app's 413 message, 5.2 MB gives Netlify's own 413; one real Generate on the Floraday screenshot answered in about 6 s (annotate.v12, one distance entry, no invalid); a second one from the browser with the invitation link gave two entries. The call-limit overflow was not tried on Netlify.
- The model account's limit only sends alerts (owner), so spending needs a cap of our own: `lib/budget.ts` keeps one counter in a Netlify Blobs store (package `@netlify/blobs` 8.2.0, no dependencies of its own; version 11 would have added about 40 packages), checked just before each paid request; refuses with 503 at `TOTAL_REQUEST_CAP` or when the counter is unavailable; `BUDGET_EPOCH` starts a new count; it can overshoot by a few under simultaneous requests. 7 new tests (185 pass), `tsc` and `lint` pass, the production build passes, and a local production server with the cap set refuses safely (503 budget_unavailable) without calling the model.
- To switch it on: set `TOTAL_REQUEST_CAP` in Netlify (for example 700), redeploy, and test with a small cap first (for example 2 with `BUDGET_EPOCH=test`: the third request must be refused), then set the real cap and a new epoch.

## 2026-10-29: Netlify config, production check, and a review of the Korean content (no live requests)
**Status: `netlify.toml` added (pins Node 22; the environment variables are listed in its comments, never their values). Merged under the owner's standing approval.**
- Production build checked in an isolated worktree: `npm run build` passes (`/` static, `/api/annotate` dynamic, cacheComponents and partial prefetching on). The production server was started with `ACCESS_CODES` set and called over HTTP: page 200, no or wrong code 401, right code reaches the normal checks (400 for an empty form), third call within the hour 429 with the limit set to 2; without `ACCESS_CODES` the route answers 503 (fails closed). Still unchecked: the same on Netlify itself (the per-instance limits, the Next.js adapter, the 60 s function limit).
- **Review of the Korean content for the judges (owner's question): kept, nothing deleted.** There are 21 lines in 6 tracked files: the prompt rule that the answer follows the language of the notes (with a Korean example), 12 Korean originals of the converted ContextMark cases (kept so the translation can be checked), two unit tests for CJK text wrapping and for `capitalizeFirst`, and notes in this log. Reasons: the judges read English and the hackathon is global, so a model answer in the user's own language is a feature, not a flaw; removing the prompt rule would change the prompt (a new version and a new measurement) for no gain; the tests and originals are labelled. What needed care was the claim: the README now says that other languages are accepted but only English notes are evaluated.

## 2026-10-29: UI polish pass (CSS and light markup; no behaviour change, no new dependency, no live requests)
**Status: done on branch `feat/ui-polish`, waiting for the owner's visual review (before and after screenshots in desktop and mobile widths, dark and light, empty and result states, taken with headless Chrome against the dev server with a stubbed model answer).**
- Header: a logo mark in front of the name (an accent-colour tile with a P and a red callout dot; the first try, a red numbered badge, looked like annotation 1 and was dropped; options A box with a dot and C corner brackets with a dot were drawn too), and a row of four numbered steps (add a screenshot, write rough notes, generate then edit, export a PNG).
- Empty state: a larger drop area with a tinted dashed border, an upload icon, and a filled "Choose file" button.
- Result state: the annotation list numbers are the same red badges as on the image; panels have a soft shadow and 12 px corners; buttons and the export select are rounder, with hover and focus-visible rings.
- Tokens in `app/globals.css`: `--accent-soft`, `--shadow`; system fonts kept. Touched: `app/globals.css`, `components/Workspace.module.css`, `components/AnnotationList.module.css`, and the header and drop-area markup in `components/Workspace.tsx`.
- Checked: no horizontal overflow at 390 px; `npm test` 178 pass, `tsc` and `lint` pass. The round "N" at the bottom left of the screenshots is Next.js's development indicator, not part of the app.

## 2026-10-29: Route protection for the Netlify deployment (access code + call limit; no live requests)
**Status: implemented and tested locally; not deployed. The owner also approved the two visible changes (2026-10-29): the image limit is now 4 MB (`MAX_IMAGE_BYTES`, the empty state, the server message, README, `CLAUDE.md`) and a muted line under the Generate button said that the screenshot and notes are sent to Meta's Muse Spark model API, that Pyosi does not store them, and not to upload confidential or personal information. **Corrected the same day:** the owner had approved only the notice that the data is sent to the model API; the two extra statements were added by Claude without showing the wording, and "does not store them" is true only for the app code (Meta's and the host's retention are unchecked). The line now reads "Your screenshot and notes are sent to Meta's Muse Spark model API to generate the annotations."; the warning about confidential or personal information goes into the beta invitation and the README. README Data handling now describes the access code, the call limits and the `sessionStorage` use. All user-facing and server messages are in English.**
- Owner's decisions: deploy on Netlify; a code per tester plus a call limit; budget $5; beta testing optional.
- `lib/access.ts`: access codes from `ACCESS_CODES`, constant-time comparison, a sliding-window limiter per code and for the whole site (in memory), fail-closed in production without codes. `lib/access-client.ts` + `components/Workspace.tsx`: the page takes `?code=` from the invitation link, keeps it in `sessionStorage` and sends it in the `x-access-code` header. `lib/annotate-handler.ts` takes an optional guard and an optional model timeout; `app/api/annotate/route.ts` builds both from the environment.
- Checks: 178 tests pass (9 new); `tsc` and `lint` pass; the real route handler was called with production and development settings (503 without codes, 401 for a wrong code, 429 over the limit, open in development); in the browser the page sent the code from the address and from `sessionStorage` after the address lost it.
- Not verified: behaviour on Netlify (limits per instance, `cacheComponents`, request size, the 60 s function limit); the limits are best effort there.

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

## 2026-10-29: ContextMark cases measured (prompt v12, 60 live requests, about $0.30; total spent about $1.00)
**Status: first measurement of plain box notes, ambiguous and missing elements. 46 of 60 runs pass (77%); 46 of 57 (81%) if the 3 timed-out requests are left out. Raw responses: `.eval/2026-10-29-annotate.v12-cm` (git-ignored). No pass bar is applied to this set yet.**

| case | what | pass (5 runs) | median IoU | notes |
|---|---|---|---|---|
| CM1 | one button looks small | 5/5 | 0.93 | |
| CM2 | card + button in one note | 4/5 | 0.93 | 1 request timed out |
| CM3 | refresh button that does not exist | 5/5 | | reported as not found every time |
| CM3b | same, with its expected position | 4/5 | | 1 request timed out |
| CM4 | "hover effect isn't noticeable" (boundary case) | 1/5 | | 4 runs boxed the Rainy card, which is the hovered one (IoU with the card of CM6 about 1); ContextMark itself marked this case as a boundary |
| CM5 | one icon is small | 4/5 | 0.87 | 1 request timed out; half of the boxes are below 0.7 |
| CM6 | the hovered card | 5/5 | 0.98 | |
| CM7 | a card named in the note | 5/5 | 0.99 | |
| CM8 | hover note, no hover visible | 2/5 | | 3 runs put one box around all four cards instead of answering ambiguous |
| CM9 | "card icons" = all four icons | 1/5 | 0.00 | 1 run found 4 boxes, 1 run drew one wide box over all icons, 3 runs answered ambiguous |
| CM10 | only one button, must not be ambiguous | 5/5 | 0.93 | |
| CM11 | delete button that does not exist | 5/5 | | |

- **What is solid:** a located element named or clearly implied by the note (CM1, CM2, CM6, CM7, CM10): median IoU 0.93 to 0.99 and 24 of 25 passing runs (the failure is a timeout). Elements that do not exist are reported as not found in 14 of 14 completed runs (CM3, CM3b minus one timeout, CM11).
- **What is weak:** deciding between ambiguous and a guess (CM4, CM8: the model tends to commit to the most plausible element or to a group box), and a plural reference ("card icons", CM9: ambiguous or one merged box in 4 of 5 runs). Small icon boxes are less exact (CM5).
- **Decision on CM4 and CM8 (owner, 2026-10-29), applied and rescored for free from the saved answers:** when the image itself points to a single element, "ambiguous" and a box on that element are both accepted (new expectation `ambiguousOr`, used for CM4: the only card in the hover state); with no such evidence (CM8) only "ambiguous" passes, and a box around the four cards stays a failure. Result: CM4 1/5 -> 4/5 (the 5th run boxed all four cards), overall **49 of 60 runs (82%); 49 of 57 (86%) without the 3 timeouts**. CM8 stays 2/5. Open point (2) below remains.
- **Open point:** the timeouts: 3 of 60 requests (5%) timed out ("The model request timed out."); earlier runs had 1 "no content" in 30; the app does not retry (one request per Generate).
- Not covered by these cases: other screen types (dark mode, mobile, dense UI), notes that are not about layout, and the English wording of the notes is a translation of the owner's Korean originals.

## 2026-10-29: ContextMark cases converted for the evaluation harness (no live requests, no cost)
**Status: converted and dry-run; not measured yet (a live run needs the owner's approval of the number of requests and the cost).**
- `eval/cases-contextmark.mjs`: 12 cases (CM1 to CM11, CM3b) from ContextMark's test setup (the owner's own Floraday web app; ground truth "gt_v2" measured by the owner on 2026-10-22). Notes translated to English; the Korean originals are kept in the file. Expectations: `target` (box with IoU >= 0.5), `ambiguous`, `absent`.
- `eval/score.mjs`: new expectation types `target` and `ambiguous`, IoU thresholds (draft), `targets` in the run score, `medianIou` and `goodShare` in the case summary. Existing scoring is unchanged. `scripts/eval.mjs --set contextmark` runs the set (no pass bar yet).
- Checked with hand-made fake answers through the replay path: exact box, a box off the target, a missing element, an ambiguous answer and a four-box answer all score as intended. `npm test` 168 pass (6 new), `tsc` and `lint` pass.
- Privacy: three of the four screenshots show the browser window (tab, address bar with a source query, a small profile picture, on one the macOS menu bar with the date and the status icons); they are kept in `.eval-private/contextmark/` (git-ignored) and are not committed. The fourth is `public/fixtures/floraday.png`.
- Cost of a live run (not requested): 12 cases x 3 runs = 36 requests, about $0.18; x 5 runs = 60 requests, about $0.30.

## 2026-10-29: Test plan v2 and browser checks of editing and export (no code change, no cost)
**Status: `docs/test-plan.md` rewritten (draft, awaiting the owner's approval of areas and case sources); the editing and export checks were run by Claude in the browser. One finding, nothing fixed.**
- Why: the owner expected the tests to validate the whole annotation app; in practice 8 of 10 live cases were about distance lines and only one was a plain box note. The plan now names areas A to G (target identification, ambiguous/missing, screen variety, wording, consistency, distance lines, editing/export), lists case sources (existing D1 to D10, the ContextMark cases, new screenshots with ground truth read from the page) and a tuning / held-out split.
- Browser checks (stubbed model answer): move, resize, delete (key and button), text edit, badge overlap, export size and content, image sizes, narrow window all pass; error texts are understandable but technical; Copy was checked for data only. Details in `docs/test-plan.md` section 8.
- **Finding:** the pixel snapping draws the Floraday card-to-button gap as 986 to 1050 px instead of the true 978 to 1023 px (the end enters the button), because the button's light grey outline is below `INK_DIFF`. The harness passes D3 anyway (its limits are about 82 px and 31 px here), so the thresholds need calibration against what a person sees as wrong. Fixing it changes visible behaviour: needs approval and a measurement on the distance cases.
- Follow-up (offline, free): six snapping variants (move limit 12/8 px, ink threshold 20/15, faint-line rule, faint-line + limit) compared on 50 saved gaps and on shifted true gaps. None beat the current code on model answers (median 1 px, worst 76 px); the limits and thresholds lose the gains on D1, D2, D6, D9. The Floraday overshoot only appears when the model's value is already accurate. Snapping unchanged; recorded as a known limit. Details in `docs/test-plan.md` section 8.
- Open: owner to approve the plan; ContextMark case conversion; a decision on `feat/gap-to-next` (v14 not merged, not pushed).

## 2026-10-29: M5 result: v14 full re-measurement against v10 and v11 (30 live requests, about $0.15; total spent about $0.70)
**Status: M5 measurements are done. The `gap_to_next` structure (v14, branch `feat/gap-to-next`, committed `4c29de4`, not pushed, not merged) removes the invalid entries but is not better than v11/v12 overall, so it is not merged. `main` stays on v12.**

| case | v10 (5 runs) | v11 (3 runs) | v14 (3 runs) |
|---|---|---|---|
| D1 toolbar | 4/5 | 3/3 | **1/3** (the Relaunch button missing from the list in 2 runs, so no last gap) |
| D2 icon list | 0/5 | 1/3 | 0/3 (Audio box 20 to 30 px too high; one run also measured to the Meta logo above the list) |
| D3 Floraday gap | 5/5 | 3/3 | 3/3 |
| D4 Floraday box | 5/5 | 3/3 | 3/3 |
| D5 missing element | 0/5 | 3/3 | 2/3 (one run again measured to another button) |
| D6 synthetic row | 4/5 | 3/3 | 3/3 |
| D7 8-item list | 0/5 | 0/3 | 0/3 (median edge error 6.5%) |
| D8 box plus gap | 0/5 | 3/3 | 3/3 (entry count 2 to 4) |
| D9 PCB drawing | 5/5 | 2/3 | 3/3 |
| D10 mounting plate | 5/5 | 3/3 | 3/3 |
| **all runs** | **28/50 (56%)** | **24/30 (80%)** | **21/30 (70%)** |

- Invalid distance entries (an empty pointer): v10 0 of 119, v11 2 of 59, v12 1 of 21, v14 structure 0 of about 100 gaps. That problem is solved by the structure.
- What v14 costs: in D1, 2 of 3 runs left the last item (the Relaunch pill) out of the list, so its gap never appears (v11 and v12: 0 of 6 runs). Possibly because the last item carries a null gap and invites leaving it out; not tested. A missing gap is silent, an invalid entry is visible, so this is the worse failure for a user.
- 21 against 24 runs of 30 is within the noise of such small samples; the per-case rule (80% of runs, stable entry count, median error) is met by 5 of 10 cases with v14 (D3, D4, D6, D9, D10), 6 of 10 with v11.
- **What is reliable today (3 of 3 runs in both v11 and v14):** D3 (card and button), D4 (box note), D6 (row of squares), D10 (mounting plate); also D8 and D9 with small variation in the number of entries. **Not reliable:** D7 (many items in a list), D2 (small icon box position), D1 (completeness of the last item).
- Not yet tried: asking explicitly that the last item stays in the list, a second measurement of v12 with the same 30-run protocol (v12 was only run on 3 cases), `strict` response format.

## 2026-10-29: Prompt v12 ("between" as a list) did not remove the empty-between failures (9 live requests, about $0.04; uncommitted)
**Status: v12 on branch `feat/prompt-v11` (uncommitted); verification D1, D2, D9 x 3 runs. Inconclusive for the fix, no regression seen.**

- v12: `between` is always a list in the response schema (two labels for a distance entry, an empty list otherwise; no null) and the prompt says it is required. Verified on D1 3/3 (v11: 3/3), D9 3/3 (v11: 2/3), D2 1/3 (v11: 1/3).
- **The failure is still there:** 1 of 21 distance entries had `between: []` (D2 run 3; v11: 2 of 59; v10: 0 of 119). With so few entries the two rates (about 5% and 3%) cannot be told apart; the schema change did not remove it, because the schema is guidance (`strict: false`) and the model can still choose an empty list.
- D2 in detail: the two gap lines are exact along the line (edge error 0.0 to 0.2%) when they come back; in 2 of 3 runs they also span the label text beside the icons (cross position about 10% of the long side off the icon column; the same ambiguity as D7, where the row includes its labels); the box for the Audio icon is 20 to 30 px too high in every run.
- Options not tried (need approval): (a) a fallback that reads the two item names from the entry's own label when `between` is empty (changes the "never repair" rule); (b) a structure where the gap hangs on the item before it (`gap_to_next`), so there is nothing to point at; (c) `strict: true` in the response format (untested with this API).
- Budget: about $0.445 used.

## 2026-10-29: Prompt v11, regression check and full result (31 live requests in total, about $0.155; not committed)
**Status: v11 measured on all 10 cases x 3 runs. Better than v10 overall, but one new failure mode and two cases below the bar; not merged.**

- Owner-approved changes before the run: the D5 case is now "no distance line, and the named element is reported as not found" (other boxes, such as the title the notes mention, are fine); the summary also shows failed requests.
- **Overall: v10 28/50 runs pass (56%) -> v11 24/30 (80%).** Per case (v10 -> v11): D1 4/5 -> 3/3, D2 0/5 -> 1/3, D3 5/5 -> 3/3, D4 5/5 -> 3/3 (entry count 1 or 2, stability 67% fails the case rule), **D5 0/5 -> 3/3**, D6 4/5 -> 3/3, D7 0/5 -> 0/3, **D8 0/5 -> 3/3**, D9 5/5 -> 2/3, D10 5/5 -> 3/3. Cases meeting the bar: 6/10 in both versions, but not the same six: v11 gains D5 and D8 and loses D4 (stability) and D9.
- **Regression found:** in 2 of 59 measurement entries (D2 run 1, D9 run 3; v10: 0 of 119) the model leaves `between` empty, so the entry is reported as invalid. It is visible (the message says "measurement names no items"), not silent, but it makes D9 drop from 5/5 to 2/3. Cause: with the schema, `between` may be null for any entry and the model sometimes picks null for a measurement (with temperature 0 it did so every time, 4 of 4). Candidate fix: a schema without a null option for measurements (for example a separate list of measurements, or an empty list instead of null), to be verified with D1, D2 and D9 (about 9 requests).
- Still weak: D7 (8 items, 0/3, median edge error 4.2%), D2 (one gap box and the Audio box position), one "no content" API answer (1 of 30).
- Budget: about $0.405 used of the proposed $0.35 (baseline $0.25, v11 re-measurement $0.075, probe $0.005, regression $0.075).

## 2026-10-29: Prompt v11 and the first re-measurement (16 live requests, about $0.08; not committed)
**Status: on branch `feat/prompt-v11`, uncommitted. v11 is better than v10 on the 5 cases that were re-run; the other 5 cases (D3, D4, D6, D9, D10) have not been re-run, so a regression is not excluded. Not ready to merge.**

- v11 (owner-approved): only the space between two elements becomes a distance line; size notes ("too large", "too narrow") get a box; the width/height ("of") path is gone from the prompt and the response schema; a named element that is not visible is `not_found` and is never replaced by another element; each measurement description names its two items; "a list of N items has N-1 gaps".
- Same cases, v10 baseline against v11: **D8 0/5 -> 3/3** (size note is a box now), **D1 4/5 -> 3/3**, D2 0/5 -> 1/3, D7 0/5 -> 0/3 (median edge error 5.3% -> 4.2%), D5 0/5 -> 0/3 as defined. Together 4 of 25 runs -> 7 of 15 on these five cases.
- D5: the real defect is fixed: "Refresh button" is `not_found` in 3 of 3 runs and nothing is measured to another button. The case still fails because it expected nothing located at all, while the model also boxes the existing title that the notes mention (a legitimate reference, not a false claim). The case definition should become "no distance line, and the named element is not found"; to be confirmed by the owner (it is my definition changing after seeing results, so it is reported both ways).
- New issues seen: (1) in 1 of 35 measurement entries (v10: 0 of 119) the model left `between` empty, which makes the entry invalid (the message now says why: "measurement names no items"); (2) 1 of 15 requests got "The model API returned no content" (D7); (3) D7 stays poor: the model locates only part of the 7 gaps in an 8-item list.
- **Temperature**: the API accepts `temperature: 0` (an optional, off-by-default parameter was added to the request code for the harness only; `--temperature`). With the current schema it is harmful: in the one probe run (D1) all 4 measurement entries came back with `between` empty (4 of 4, against 1 of 35 without it): greedy decoding picks the "null" option. Not adopted. A schema without the null option for measurements would be the fix to try before revisiting temperature.
- Budget: used about $0.33 of the proposed $0.35 (baseline $0.25, re-measurement $0.075, probe $0.005). A regression check of the 5 cases not re-run needs about $0.075 more.

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

## 2026-10-30: Netlify builds stopped; the header sentence follows the narrative
- Netlify emailed that 50% of the 300 monthly credits was used. The likely cause (not confirmed: the usage page is the owner's) is the two days of PRs, about 40 builds counting previews and production. The owner set **Build status: Stopped builds**. The live site keeps serving the last deploy (checked: page 200, `/api/annotate` without a code 401), which is the code of PR #21; later changes are docs or wait for the next deploy.
- **To deploy again** (a code fix, or an environment variable change): set Build status back to **Active builds**, let one build run, then stop builds again. In the stopped state the page says new deploys go through the CLI or API only, so there is no Trigger deploy button to rely on.
- The header sentence and the page description said "Turn screenshots and rough notes into clear visual explanations", the first idea of the product. They now say "Pyosi finds the part of a screenshot you're talking about, and marks it." (owner chose option A on 2026-10-30). Text only; not on the live site until the next deploy.
