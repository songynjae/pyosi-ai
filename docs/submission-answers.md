# Answers for the submission form (DRAFT for the owner's review)

Written 2026-10-30 by Claude. Check every sentence; change the wording freely. Nothing here claims more than the repository and the measurements show. Items marked **[owner]** are yours to fill in.

## Team and track
- Team name: **[owner]**. Team member: Yoonjae Song. (Sole contributor.)
- Track: **Indie Developer Track**. Problem statement: **Build for Your World**.
- Public GitHub repository: **[owner: the URL, after the repository is made public]**
- 3-minute demo video: **[owner: the link]**

## Project description (about 200 words)
Pyosi turns a screenshot and a few rough notes into numbered marks on the screenshot, each with a one-sentence explanation. Write "the photo looks too large" or "the card and the button are too close" and Pyosi finds the elements, draws boxes, and, for spacing notes, draws the distance between two elements. The marks are editable (move, resize, delete, rewrite) and can be exported as a PNG at the original size, so the result can be pasted into a ticket or a chat instead of a paragraph of explanation.

The problem is one I know first-hand: describing which element a comment is about takes more words than the comment itself. Pyosi keeps the notes' language and tone, says "not found" when the note names something that is not on the screen, and says "ambiguous" when a note fits several things, instead of inventing a box.

It is not a generic image analyzer. The model locates elements; Pyosi's own code validates every answer, computes the gaps, snaps the distance lines to the real pixels, and refuses to repair invalid output silently. An evaluation harness with fixed cases, saved raw answers and published results (49 of 60 runs on 12 plain-note cases, 24 of 30 on 10 distance cases; the weak spots are listed in the README) shows how often the marks are right. The target user, engineers who share screenshots, is an assumption I have not validated.

## How I used Meta products
Pyosi calls **Muse Spark 1.3 (`muse-spark-1.3`) through the Meta Model API**, in standard mode on purpose (the contributor mode trains on prompts). I use three capabilities: vision input (the screenshot), spatial grounding (the model answers with `[x_min, y_min, x_max, y_max]` boxes on a 0 to 1000 grid, which my code converts to percent boxes), and structured JSON output with a response schema (annotations and, for spacing notes, rows or columns of items). The prompt and schema are versioned in the repository, and each version was measured on the same cases. I did not use open-weight models, so I am not applying for that bonus.

## Why Meta's models are important to my solution
The product only works if the model can look at an arbitrary screenshot and say where things are. Muse Spark's grounding, boxes that land on the named element, is what lets plain notes become marks: on clearly named elements the boxes overlap my hand-measured boxes with a median IoU of 0.93 to 0.99. Its structured output made it possible to ask for every item of a row once and compute the gaps in code instead of trusting the model's arithmetic. The same ability worked on drawings that are not user interfaces (a circuit board and a mounting plate with a keep-out zone), which is why I think the idea can grow beyond UI feedback.

## Feedback on partner technologies (optional)
Not used (**[owner]** may leave it empty).

## How likely are you to build with the Meta Model API / overall opinion
**[owner]** Facts you may want to use: one request takes about 4 to 7 seconds; about 5% of my requests timed out in 60-request runs; the response schema worked reliably (no invalid JSON in the measured runs); the model's boxes needed a 2x upscale of small screenshots to be accurate.
