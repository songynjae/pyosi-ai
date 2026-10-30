# Demo video script (DRAFT for the owner's review)

Target length: **3:00** (the form asks for a 3-minute demo video). Written 2026-10-30 by Claude from the measured results; the owner records the video (planned Monday 2026-11-02) and may change anything. Narration is in English.

## Before recording
- Use the hosted app (https://pyosi.netlify.app) with the invitation link, or `npm run dev` locally; **do not show the address bar or the code** (crop the window or record only the page). The code is a secret that spends the owner's budget.
- Screenshots to use (none show personal data):
  - `public/fixtures/floraday.png` (the author's own Floraday app).
  - `docs/demo-assets/d10-mounting-plate.png` and `docs/demo-assets/d9-pcb-top-view.png` (drawn by code; `node --experimental-strip-types scripts/export-demo-images.mjs` recreates them).
  - For the "not found" scene: a copy of ContextMark's `CM_Case_3.png` (the author's Floraday app with a different flower) **cropped to the page area** (the original shows the browser tab, address bar and profile picture).
- Run every scene once or twice before recording: the model answers differ slightly from run to run. If a scene looks wrong, record it again; do not edit the result by hand except in the editing scene.
- Each Generate costs about $0.005 and counts against the cap of the hosted demo (700 requests); a full rehearsal is about 10 requests.

## Scenes

| Time | Scene | On screen | Narration (draft) |
|---|---|---|---|
| 0:00 to 0:20 | The problem | The empty app (logo, four steps) | "When I report a UI problem with a screenshot, I end up writing a paragraph about which element I mean. Pyosi turns the screenshot and a few rough notes into marks on the picture, with a sentence for each." |
| 0:20 to 0:55 | Notes become marks | Floraday screenshot dropped in. Notes: *The flower image tile looks too large. Also the Choose Another Sky button is hard to notice. Please check that too.* Generate. Show boxes 1 and 2 and the list. | "Two elements in one note. Pyosi finds both, numbers them, and restates each point in one sentence. The model is Meta's Muse Spark, asked for boxes on a 0 to 1000 grid; the code checks every answer and never repairs a bad one." |
| 0:55 to 1:30 | Spacing becomes a line | Mounting plate. Notes: *The spacing between the two top mounting holes should be 40 mm. Please check. Also check whether anything sits inside the red hatched keep-out zone.* Generate. Show the distance line between the holes, the box on the part in the keep-out zone, and that the "40 mm" from the note is kept. | "For spacing notes Pyosi draws the distance. The model locates every item once; my code computes the gap and snaps the line to the real pixels. It is not only for UIs: this is a drawing, and the note about a zone becomes a box." |
| 1:30 to 1:55 | Edit | Drag a box, resize it with a handle, delete one, edit a description with **Edit**. | "The model is not always right, so everything is editable: move, resize, delete, rewrite." |
| 1:55 to 2:15 | Export | Choose **Annotated**, click **Download PNG**; open the file; show **Copy** and paste it into a chat or a document. | "Export is a PNG at the original size, with the descriptions under the picture, ready to paste into a ticket or a chat." |
| 2:15 to 2:40 | It says "not found" instead of inventing | The cropped CM_Case_3 screenshot. Notes: *I can't see a button to refresh the flower and message tile. Please check and fix.* Generate. The entry appears in the list as "location not found" and no box is drawn. | "If the note names something that is not on the screen, Pyosi says so. No invented box. When a note fits several things it answers 'ambiguous' instead of guessing, and I measure how often that works." |
| 2:40 to 3:00 | Measured, and built on Muse Spark | The README section "How well does it work?" or the output of `npm run eval` | "I measured it: 49 of 60 runs on the ContextMark set, median overlap 0.93 to 0.99 on clearly named elements, 24 of 30 on the distance cases, and I list where it is weak in the README. Built with Meta's Muse Spark through the Meta Model API. The code is public. Thank you." |

## Reliability of each scene (measured 2026-10-30, 3 runs each, prompt v12, all through the same code as the app)
- Notes become marks (ContextMark CM2): 3 of 3 pass; the card box has median overlap 0.93, the small button box is less exact (half of its boxes below 0.7 overlap). Earlier run: 4 of 5.
- Spacing and keep-out zone (D10): 3 of 3 pass, edge error 0.1%.
- Also reliable if you want another scene: the hardware drawing D9 (clearance between C3 and J1, overlap of H1 and U1): 3 of 3, edge error 0.0%; the squares row D6: 3 of 3; one named element (CM1, CM6, CM7, CM10): 3 of 3 each, median overlap 0.93 to 0.98; card and button gap on Floraday (D3): 3 of 3 with a small edge error, but see the limit below.
- "Not found" (CM3 note on the cropped screenshot): 5 of 5 in the earlier run. **Do not use the Floraday note "The Refresh button is too far from the title" (D5): 2 of 3 today, in one run the model drew a distance line to another element.**
- Photo too large plus gap in one note (D8): 3 of 3.
- Limits worth showing or avoiding: on the Floraday card and button gap the line's lower end can reach into the button (light grey outline, up to about 27 px); notes about "the card icons" (plural) or about a hover effect when nothing is hovered are often answered as ambiguous or with one box around a group.

## Recording checklist
- 1920x1080 or similar, the browser zoomed so that the list and the image are readable; dark or light theme, one for the whole video.
- Close other tabs and notifications; hide the address bar (the invitation code is in it).
- Read the narration slowly; leave a pause after Generate (the answer takes about 4 to 7 seconds; cut the wait in editing).
- Upload to a place the form's link can reach (for example YouTube, unlisted) and open the link in a private window to check it plays.
