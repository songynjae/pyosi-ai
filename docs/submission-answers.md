# Answers for the submission form (DRAFT for the owner's review)

First written 2026-10-30 by Claude, rewritten the same day around the owner's narrative: *Pyosi identifies the part of a screenshot you are talking about, and marks it.* Check every sentence; change the wording freely. Nothing here claims more than the repository and the measurements show. Items marked **[owner]** are yours to fill in.

## Team and track
- Team name: **[owner]**. Team member: Yoonjae Song. (Sole contributor.)
- Track: **Indie Developer Track**. Problem statement: **Build for Your World**.
- Public GitHub repository: **[owner: the URL, after the repository is made public]**
- 3-minute demo video: **[owner: the link]**

## One sentence
Pyosi identifies the part of a screenshot you are talking about, and marks it.

## Project description (about 200 words)
When people send a screenshot, their message says which part they mean: "the delivery date on the second line", "the button below the card", "the gap between the two holes". The reader still has to find it. Pyosi closes that gap. You write or paste the message you were going to send anyway, and Pyosi identifies the parts of the screenshot it refers to, finds them by what they are (a date, a price, a message that confirms something) and not only by name, and marks them with numbered boxes, or draws the distance when the message is about the space between two things.

It is not an image analyzer: it does not describe what is in a picture. It starts from what the person says and answers one question, "which part is that?", and it says "not found" or "ambiguous" instead of guessing when it cannot tell. The marks are editable and can be exported as a PNG (marks only, so your own message stays yours, or with a short explanation per mark).

The model locates; Pyosi's own code validates every answer, computes the gaps, snaps the distance lines to the real pixels, and never repairs invalid output silently. An evaluation harness with fixed cases and published results shows how well it works and where it does not (the weak spots are in the README). The target user is an assumption I have not validated.

## How I used Meta products
Pyosi calls **Muse Spark 1.3 (`muse-spark-1.3`) through the Meta Model API**, in standard mode on purpose (the contributor mode trains on prompts). I use three capabilities: vision input (the screenshot), spatial grounding (the model answers with `[x_min, y_min, x_max, y_max]` boxes on a 0 to 1000 grid, which my code converts to percent boxes), and structured JSON output with a response schema (annotations and, for spacing notes, rows or columns of items). The prompt and schema are versioned in the repository, and each version was measured on the same cases. I did not use open-weight models, so I am not applying for that bonus.

## Why Meta's models are important to my solution
The product only works if the model can read a person's words and a screenshot together and say which part of the picture the words are about. Muse Spark's grounding does that: on messages and notes that name a part, the boxes land on the right part in nearly every run (14 of 14 completed runs on message-style notes found every target; median overlap with my hand-measured boxes 0.72 to 0.99, 0.93 to 0.99 on clearly named elements), including small table cells and a chat message found by what it says, and the model reports a requested item that is not on the screen as "not found" rather than boxing something else. Its structured output let me ask for every item of a row once and compute the gaps in code instead of trusting the model's arithmetic. The same ability worked on drawings that are not user interfaces (a circuit board and a mounting plate with a keep-out zone), so I think the idea reaches beyond UI feedback.

## Feedback on partner technologies (optional)
Not used (**[owner]** may leave it empty).

## How likely are you to build with the Meta Model API / overall opinion
**[owner]** Facts you may want to use: one request takes about 4 to 7 seconds; about 5% of my requests timed out or failed in measured runs (one HTTP 502 and three timeouts in 75 requests of the last two series); the response schema worked reliably (no invalid JSON in the measured runs); the model's boxes needed a 2x upscale of small screenshots to be accurate.
