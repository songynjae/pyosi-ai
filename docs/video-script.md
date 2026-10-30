# Demo video script (DRAFT for the owner's review)

Target length: **3:00** (the form asks for a 3-minute demo video). First written 2026-10-30 by Claude, rewritten the same day around the owner's narrative: *Pyosi identifies the part of a screenshot you are talking about, and marks it.* The owner records the video (planned Monday 2026-11-02) and may change anything. Narration is in English.

## The one sentence (say it near the start and again at the end)
> "Pyosi identifies the part of a screenshot you're talking about, and marks it."

Why this and not "it generates annotations": the product starts from what the person says ("the delivery date on the second line", "the message where she confirms the price", "the gap between the two holes") and answers *which part is that?* An image analyzer starts from the image and describes what it sees; Pyosi starts from the person's words. When it cannot tell, it says so (not found, ambiguous) instead of guessing.

## Before recording
- Use the hosted app (https://pyosi.netlify.app) with the invitation link, or `npm run dev` locally; **do not show the address bar or the code** (crop the window or record only the page). The code is a secret that spends the owner's budget.
- Screenshots to use (none show personal data; all are fake or the author's own app):
  - `public/fixtures/floraday.png` (the author's own Floraday app).
  - `eval/fixtures/text/t1-order.png` (purchase order), `t3-chat.png` (chat), `t2-email.png` (email): mock screens with fake data.
  - `docs/demo-assets/d10-mounting-plate.png` (drawn by code; `node --experimental-strip-types scripts/export-demo-images.mjs` recreates it).
- Paste the **message** into the notes box exactly as written below (a real message, with a greeting). Run every scene once or twice before recording: the answers differ slightly from run to run.
- Each Generate costs about $0.005 and counts against the cap of the hosted demo (700 requests); a full rehearsal is about 10 requests.

## Scenes

| Time | Scene | On screen | Narration (draft) |
|---|---|---|---|
| 0:00 to 0:20 | The problem | The empty app (logo, four steps) | "When I send a screenshot, my message says which part I mean: 'the date on the second line', 'the button under the card'. The reader still has to hunt for it. Pyosi identifies the part of a screenshot you're talking about, and marks it." |
| 0:20 to 0:55 | Paste the message you would send anyway | Floraday screenshot. Notes: *Hi Anna, thanks for the update. The lily card looks too big on the page, and the Choose Another Sky button is hard to see. Could you check both before Monday?* Generate. Show boxes 1 and 2. | "I paste the message I was going to send anyway. Pyosi works out which parts of the screenshot it is about, the card and the button, and marks exactly those. It doesn't mark the greeting or the deadline, only what I'm pointing at." |
| 0:55 to 1:30 | Several things, found by what they mean | Purchase order. Notes: *Hi Min-jun, I looked at the purchase order. The delivery date on the second line looks wrong to me, and the unit price there seems higher than we agreed. Could you confirm both today? Thanks, Anna* Generate. Two small boxes on the date and the price of line 2. Then, optionally, the chat screen with: *Please look at the message where she confirms the price. Also, I could not find the discount she promised.* | "It finds things by what they are, not only by name: the date and the price of the second line, or 'the message where she confirms the price'. And the discount she promised isn't in the chat, so Pyosi says 'not found' instead of inventing a mark." |
| 1:30 to 1:55 | It works on more than UIs, and on gaps | Mounting plate. Notes: *The spacing between the two top mounting holes should be 40 mm. Please check. Also check whether anything sits inside the red hatched keep-out zone.* Generate. The distance line between the holes and a box on the part in the keep-out zone. | "A note can also refer to the space between two things. Pyosi draws that distance, snapped to the real pixels, and marks the part inside the zone. This is a drawing, not an app." |
| 1:55 to 2:20 | Fix it, then send it with your own words | Drag a box, edit one description with **Edit**. Choose **Boxes only**, **Copy**, paste the image into a chat next to the original message. | "If a mark is off, move it. Then I copy the image with just the marks and send it with my own message. There is nothing to rewrite: the message stays mine." |
| 2:20 to 2:40 | When it can't be sure | A note that fits several things, or the plural case "The card icons look a bit small." (it often answers ambiguous); show the list entry "location ambiguous". | "When a note fits several things, Pyosi says it is ambiguous. It doesn't guess. That is part of identifying what you mean: knowing when you can't." |
| 2:40 to 3:00 | Measured, built on Muse Spark | The README section "How well does it work?" | "I measured it. On messages and notes that name a part, the marks land on the right part in nearly every run, and the README lists where it is weak. Built with Meta's Muse Spark through the Meta Model API. The code is public. Thank you." |

## Reliability of each scene (measured 2026-10-30, 3 runs each, prompt v12, through the same code as the app)
- **Message with a greeting about two elements (M1, Floraday):** both targets found in 2 of 2 completed runs (median overlap with the hand-measured boxes 0.99); one run failed with an HTTP 502 from the model API. Rehearse it more than once.
- **One element among remarks that need no mark (M2):** 3 of 3, only the button was marked (nothing for "sign-in worked well"), median overlap 0.91.
- **Purchase order message (M3):** 3 of 3 runs marked both the date and the price of line 2 and nothing else; median overlap 0.84.
- **Email message (M4):** both phrases found in 3 of 3 runs; the boxes are loose on 18 px high phrases (median overlap 0.72). Not the best scene for "precise".
- **Chat message plus a promise that is not there (M5):** 3 of 3: the right message marked (overlap 0.98) and the discount reported as "not found", never boxed.
- Strict harness result for the message set: 6 of 15 runs "pass", but the 9 failures are all the same wording rule (a polite question in a message, "Could you check both before Monday?", is turned into a statement such as "needs to be checked before Monday", which the harness counts as "question not kept"); every completed run found every target. Counted by the position of the marks only, 14 of 14 completed runs.
- The mounting plate (D10) 3 of 3, edge error 0.1%; the plural case "the card icons" and a hover note when nothing is hovered are often answered as ambiguous or with one box around a group (use only as the "can't be sure" scene).
- Do **not** use the Floraday note "The Refresh button is too far from the title" (D5): 2 of 3 on 2026-10-30 (once a distance line to another element instead of "not found"). For "not found" use the chat scene above.
- Limits worth knowing: on the Floraday card and button gap, a distance line's lower end can reach into the button (light grey outline, up to about 27 px).

## Recording checklist
- 1920x1080 or similar, the browser zoomed so that the list and the image are readable; dark or light theme, one for the whole video.
- Close other tabs and notifications; hide the address bar (the invitation code is in it).
- Read the narration slowly; leave a pause after Generate (the answer takes about 4 to 7 seconds; cut the wait in editing).
- Upload to a place the form's link can reach (for example YouTube, unlisted) and open the link in a private window to check it plays.
