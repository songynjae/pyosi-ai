# Pyosi: Product Brief

## One-liner
Pyosi finds the part of a screenshot you are talking about, and marks it.

## Problem Statement
**Marking a screenshot by hand takes a separate tool or several clicks, so people either spend the time or fall back on describing in words, and the reader has to work out which part is meant.**

- **For the sender:** the options are a paragraph that points to the part in words, or a separate program (Paint, Excel, PowerPoint) to draw boxes, arrows and comments by hand.
- **For the reader:** the author's own experience is that a marked image is understood faster than a description (for example with vendors and stakeholders). The informal check below did not cover the reader's side, so this is the author's experience, not a measured result.

**Where this comes from.** The idea comes from the author's own work. As a product manager, the author always marks a screenshot of a problem before sending it. Earlier, as a machinery engineer at a shipbuilding company, the author often put a photo in a slide and added marks and comments before sending it to vendors and stakeholders, because communicating with visual content worked better.

**An informal check.** The author asked five people from their own circle how they use screenshots (overseas sales, two shipbuilding engineers, IT business development, a software engineer). All five use screenshots every day. Three mark them regularly (highlights, boxes, arrows, comments) and said marking needs a separate program or looks untidy. Two rarely mark: they crop and explain in text, and one said adding text to an image takes several clicks. This is five people, not a sample.

## Target users (unvalidated assumption)
- **Primary:** anyone who sends a screenshot together with a message that asks for a change or a check, so that the reader sees which part is meant. Often an engineer, a designer or a product manager (bug reports, PR and design reviews, incident threads).
- **Secondary:** people who read those messages and act on them; and professionals in other fields who explain things with screenshots or drawings.

## Solution
The user adds a screenshot and the notes or message they would send with it. Pyosi finds the parts the notes refer to and marks them with numbered boxes, each with a short explanation; for notes about the space between two elements it draws the distance instead. The marks can be edited and exported as a PNG.

When a part cannot be found, Pyosi does two things:
1. **It does not make anything up.** If the part is not on the screen, Pyosi says "not found" instead of marking something else.
2. **It shows the result, so the sender can check.** A part the notes name that cannot be found is labeled "not found" in the annotation list and in the annotated image, both when the message talks about it as if it were there (for example "the message where she promises the discount") and when the message itself says it is missing. The sender sees what was found and what was not before sending.

When it cannot tell which of several parts is meant, it says "ambiguous" instead of guessing.

Value (what Pyosi aims to give; not tested with users):
- **For the sender:** no drawing by hand. The sender writes the message they were going to send anyway, checks the marks, fixes what is off, and sends an image that says which part is meant. A "not found" label shows, before sending, that the message points to something that is not on the screen.
- **For the reader:** sees what is meant right away, without reading a description of where it is.

## MVP scope (deadline: 2026-11-04, 9 pm ET)
In scope:
- Screenshot input (file, drop or paste) and notes input
- AI-generated annotations (numbered boxes) with short explanations, including "not found" and "ambiguous" answers
- Preview of the annotated screenshot
- Basic annotation editing (move, resize, delete boxes; edit label and description)
- Distance lines for spacing notes (the gap between two elements), snapped to the real pixels; a note about the size of one element gets a box, not a line (decided 2026-10-29)
- Export as PNG (download and copy) at the original image size, in three formats: annotated, boxes only, original image

Out of scope for the MVP:
- The length of one element (width or height) as a measured line
- Advanced annotation editing (adding boxes, moving numbered badges)
- Accounts, history and collaboration

## Milestones
M1 to M6 are used in file names and code comments, for example `docs/m5-plan.md` and `spikes/m2-2b`.
1. **M1, scaffold + mock UI (done):** single page, upload, notes, Generate, preview with mock annotations.
2. **M2, AI integration (done):** a server-side API route that sends the screenshot and notes to the model (Meta Muse Spark) and returns annotations. Sub-steps: **2.1** annotation schema and validation (`lib/annotation-schema.ts`); **2.2-B** the Meta Model API grounding spike (`docs/m2-2b-api-spike.md`, `spikes/m2-2b/`); **2.2-C** the annotation route and its UI wiring (`app/api/annotate/route.ts`).
3. **M3, basic editing (done):** move, resize and delete boxes; edit label and description.
4. **M4, export + accuracy (done):** PNG export (download and copy), distance lines for spacing notes, pixel snapping, 2x enlarging of small images, white padding for very wide images and for tall phone screenshots. Plan: `docs/m5-plan.md`.
5. **M5, quality evaluation and stabilization (done):** an evaluation harness (`npm run eval`) with fixed cases and repeated runs, to get results that are consistent enough to demo (`docs/m5-plan.md`, `docs/test-plan.md`, `docs/eval-log.md`).
6. **M6, prepare and submit (in progress):** the hackathon form asks for a public GitHub repository and a 3-minute demo video, plus text answers. Work: public-repository preparation (license, README with how to run and Data handling, known limits, review of docs and history), a hosted demo on Netlify (decided 2026-10-29) with access codes, rate limits and a hard cap on the number of model requests, the video, the form answers. Feature freeze: Friday 2026-10-30; deadline 2026-11-04 21:00 ET.

## Open questions
- Which model/provider handles vision input? Answered: Meta Muse Spark (`muse-spark-1.3`) through the Meta Model API.
- How accurate are model-generated bounding boxes, and is a manual correction step required? Measured in `docs/eval-log.md`: good on clearly named parts, weaker on thin or small targets; the boxes can be edited in the app.
- Are engineers really the best first audience? Still open.
