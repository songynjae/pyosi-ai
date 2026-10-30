# Pyosi

**Pyosi identifies the part of a screenshot you are talking about, and marks it.** Write or paste the message you would send with the screenshot ("the delivery date on the second line looks wrong", "the card and the button are too close"), and Pyosi works out which parts you mean, marks them with numbered boxes, draws the distance when you talk about the space between two things, and says "not found" or "ambiguous" instead of guessing when it cannot tell. Each mark has a short explanation you can edit, and the marked image can be exported as a PNG. Built for the Meta Global AI Developer Hackathon (Indie Developer Track, "Build for Your World"), with Meta's Muse Spark model through the Meta Model API.

It is not an image analyzer: it does not describe what is in a picture. It starts from what the person says and answers one question, "which part is that?", with positions that are checked against the pixels and an evaluation harness that measures how often the marks are right.

## What it does

1. **Identifies the part you refer to, and marks it.** It finds things by what they are (a date, a price, "the message where she confirms the price") and not only by name, from a rough note or a full message. The model answers with boxes on a 0-1000 grid; Pyosi converts and validates them. A note about an element that is not on the screen is reported as "not found", and a note that fits several elements as "ambiguous"; neither gets an invented box.
2. **Draws distance lines for spacing notes.** The model locates every item of a row or column once; the code computes the gap between neighbours, and the line is then snapped to the real edges using the original image's pixels (when the background is plain enough to be sure).
3. **Lets you edit the result:** move, resize and delete boxes, edit labels and descriptions.
4. **Exports a PNG** at the original image size (annotated, which adds the description list below the image; boxes only; or the original), as a download or to the clipboard.
5. **Keeps the notes' language and tone** (a question stays a question; the answer is written in the language of the notes).

## Try it

- **Hosted demo:** https://pyosi.netlify.app (Generate needs an invitation link with a code, shared with the hackathon judges; the number of model requests is capped).
- **Locally:** requires Node.js 20.9 or newer and npm, and a Meta Model API key.

```bash
npm install
echo "MODEL_API_KEY=your-key" > .env.local
npm run dev
```

Open http://localhost:3000. In development the access code is not needed. To run a production build on your own machine (`npm run build && npm start`), also put `ACCESS_CODES=off` in `.env.local` (in production the route refuses everything unless `ACCESS_CODES` is set).

### Using the app

1. In the **Screenshot** area, drop a PNG/JPEG (up to 4 MB) anywhere on the page, paste one from the clipboard (⌘V / Ctrl+V), or click **Choose file**. **New image** clears the image, notes and annotations.
2. Type some rough notes (required, up to 4,000 characters).
3. Click **Generate**. Numbered callouts and bounding boxes appear over the screenshot, and annotations without a location are listed below it. Each Generate sends one request to the model API (a few tenths of a cent). Screenshots under 1400 px on the long side are upscaled 2x in the browser first, and very wide ones get white padding below; both give more accurate boxes, and only the copy sent to the model is changed.
4. Click a box to move, resize or delete it; use **Edit** in the list to change the text; use **Export** to download or copy a PNG.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (includes type checking) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the unit tests (Node's built-in runner; 185 tests; the model API is replaced by a fake `fetch`, so tests never call the network) |
| `npm run eval` | Evaluation harness (dry run by default; `--send` makes live requests that cost money; `--replay <dir>` rescores saved answers for free; `--set contextmark` runs the ContextMark cases) |

## How well does it work?

Measured with the evaluation harness (`eval/`, `scripts/eval.mjs`; raw answers kept so any failure can be replayed), on fixed cases, several runs each. Details and the history are in [docs/eval-log.md](docs/eval-log.md), [docs/test-plan.md](docs/test-plan.md) and [docs/development-log.md](docs/development-log.md).

- **Plain notes about a named or clearly implied element** (ContextMark cases CM1, CM2, CM6, CM7, CM10): median overlap with the hand-measured box (IoU) 0.93 to 0.99. A missing element was reported as "not found" in 14 of 14 completed runs (CM3, CM3b, CM11).
- **ContextMark set overall:** 49 of 60 runs pass (82%; 49 of 57 without the 3 requests that timed out).
- **Small areas of text on mock screens** (a purchase order, an email, a chat, an invoice; fake data): a table cell and a whole message are marked tightly (median overlap 0.85 and 0.98); a phrase inside a sentence is in the right place but loose (0.60 on 18 px high text); "the total amount due" got the label and the value together where the reference answer was the value only.
- **Full messages instead of rough notes** (greeting, several sentences, passing remarks): every completed run marked the right parts and nothing else; the strict wording check scored lower (6 of 15 runs) because polite requests are restated as statements.
- **Distance lines** (ten cases: a toolbar, an icon list, a web page, synthetic rows and hardware drawings; prompt v11 and v12): 24 of 30 runs pass (80%) with the draft criteria; after snapping, the line ends are typically within a few pixels of the real gap (median 1 px over 50 saved gaps; the worst, 76 px, is on the 8-item list).

**Known limits** (also what the demo does not claim):
- Deciding between "ambiguous" and a guess: the model tends to commit to the most plausible element, or to one box around a group.
- Plural references: "the card icons" is often answered as ambiguous or with one merged box; on text screens "all the delivery dates" or "every unit price" worked in most runs (the right items in 11 of 12 runs, every box within overlap 0.5 in 8 of 12), with one run that drew a single box around a whole column and one screen where the boxes sat about 14 px too low.
- Long lists (8 items in a column) and small icon boxes are less exact.
- On light grey outlines on a white background the snapping can move a distance line's end into the neighbouring element (up to about 27 px on the sample card and button).
- About 5% of the model requests time out (the app sends one request per Generate and does not retry).
- Only English notes are evaluated. Notes in other languages are accepted and answered in the same language, but that is not measured.
- The target user (engineers who share screenshots) is an assumption that has not been validated.

## Built with Meta Muse Spark

Pyosi uses `muse-spark-1.3` (standard mode, not the `-contributor` model that trains on prompts) through the Meta Model API: vision input, spatial grounding as `[x_min, y_min, x_max, y_max]` boxes on a 0-1000 grid, and structured JSON output (a response schema). The prompt and schema are in `lib/prompts/annotate.ts`; Pyosi's own code validates every answer and never repairs an invalid one silently (invalid entries are reported).

## Where the test material comes from

Everything in Pyosi (code, evaluation harness, editing, export, distance lines) was built from 2026-10-27. The Floraday screenshot (`public/fixtures/floraday.png`, a screenshot of the author's own web app), its hand-measured boxes and the ContextMark test cases come from the author's earlier discovery repository ContextMark (first commit 2026-10-19). Some evaluation cases use screenshots that are not in this repository; they are skipped when the files are missing.

## Deployment

The hosted demo runs on Netlify (`netlify.toml`; Netlify detects Next.js). Environment variables (set in the Netlify site settings, never in the repository): `MODEL_API_KEY`, `ACCESS_CODES` (a code per person), `RATE_LIMIT_TOTAL_PER_DAY`, `RATE_LIMIT_PER_CODE_PER_HOUR`, `MODEL_TIMEOUT_MS` (50000, because Netlify functions stop at 60 s), `TOTAL_REQUEST_CAP` and `BUDGET_EPOCH` (a hard cap on all model requests, see below).

## Data handling

*Snapshot of 2026-10-30, written from reading the code of `main` (after pull request #14). It describes what the app does today; it is not a security review (see "Open items").*

**What the app handles:** a screenshot (PNG or JPEG, up to 4 MB), rough notes (up to 4,000 characters) and the annotations the model returns. Notes in other languages are accepted and the model answers in the language of the notes (a few unit tests and prompt rules cover this), but the evaluation harness and the measured results cover English notes only.

**Where the data goes**

1. **Only in the browser:** showing the screenshot, upscaling or padding the copy that is sent, snapping distance lines to the real edges (reads the image's pixels), editing, and PNG export (drawn in the browser; saved or copied only when the user clicks Download or Copy). None of this uploads anything.
2. **On Generate:** the image (the original, or a 2x / padded PNG copy of it) and the notes are sent to Pyosi's own route `POST /api/annotate`. The route first checks the access code and the call limit (see below), then the size and file type (by magic bytes) and the notes length, then forwards them to the Meta model API (`https://api.meta.ai/v1/chat/completions`, model `muse-spark-1.3`, standard mode; the `-contributor` model, which trains on prompts, is not used). One request per Generate, no automatic retries, 60 s timeout (`MODEL_TIMEOUT_MS` can shorten it; the Netlify deployment uses 50 s).
3. **The answer** comes back to the browser as annotations. Error details from the model API are not forwarded to the browser.

**What Pyosi stores:** nothing. In the app code there is no database, no file writing, no server-side logging, no cookies, no `localStorage` / IndexedDB and no analytics. Everything lives in memory in the open page, so reloading the page clears the image, notes and annotations. The one exception: on a deployment protected by an invitation code, the page keeps that code in the tab's `sessionStorage` so the link's `?code=` is not needed again; it is cleared when the tab is closed.

**Secrets:** the model API key (`MODEL_API_KEY`) is read only on the server, from the environment (`.env.local` locally, which is git-ignored). It is never sent to the browser or included in a response; tests check this with a fake model API.

**Who else sees the data**

- **Meta (model API):** receives the screenshot and the notes of every Generate. How long Meta keeps them is set by Meta's terms, which have not been reviewed yet. Please do not upload confidential or personal information to a demo.
- **The hosting platform (Netlify):** may keep request metadata or logs; Pyosi itself logs nothing.
- **Voice input** is not part of the MVP and is not implemented, so no audio is captured or sent anywhere. (If it is added later with the browser's speech recognition, the browser vendor, for example Google in Chrome, would process the audio and Pyosi would not receive or store it.)

**Development:** tests never call the network (the model API is replaced by a fake `fetch`). Live requests cost money and are made only when approved. Test screenshots and raw model responses from experiments are kept outside the repository, on the developer's machine. The only screenshot in the repository is a screenshot of the author's own Floraday web app (`public/fixtures/floraday.png`), cleared for publishing; it is used by the tests and the evaluation cases, not by the app.

**Access control on a public deployment (added 2026-10-29)**

`POST /api/annotate` needs an access code: `ACCESS_CODES` (environment variable, `name:code,name:code`) lists the valid codes, and the page sends the one from the invitation link `https://<site>/?code=<code>` in the `x-access-code` header. Each code and the whole site also have a call limit (`RATE_LIMIT_PER_CODE_PER_HOUR`, default 30; `RATE_LIMIT_TOTAL_PER_DAY`, default 400), counted in memory per server instance, which is a best-effort brake on a serverless host; the model account's own spending limit is the backstop. `TOTAL_REQUEST_CAP` (optional) is a hard cap on all model requests of the deployment: one counter in a Netlify Blobs store that every server instance shares, checked just before each paid request (a request that fails validation is not counted); when the cap is reached, or the counter cannot be read, the route answers 503; `BUDGET_EPOCH` starts a new count. The counter is read and then written, so simultaneous requests can overshoot the cap by a few. In production the route refuses everything when `ACCESS_CODES` is not set; `ACCESS_CODES=off` turns the check off (for running a production build on your own machine); in development (`npm run dev`) it is open. The screen tells users that their screenshot and notes are sent to Meta's model API.

**Open items for the security check**

- Meta's retention and training terms for standard-mode requests, to be confirmed from Meta's documentation.
- Netlify's own request logging, to be checked in its documentation.
- Prompt injection: the notes are fenced as data in the prompt and the model's answer is validated, but this is not a guarantee.
- The call limits are per server instance, not shared across instances.

## Project structure

```
app/          Next.js App Router (layout, page, global styles, the API route)
components/   UI components (Workspace, AnnotationOverlay, AnnotationList)
lib/          Model client and prompts, validation, grounding, spacing, snapping, export, access control and request cap
eval/         Evaluation cases, scoring and the PNG helpers for the synthetic cases
scripts/      The evaluation harness (scripts/eval.mjs)
tests/        Unit tests
docs/         Product brief, plans, development log and evaluation log
public/       Static files, including the Floraday test screenshot
```

## Docs

- [Product brief](docs/product-brief.md)
- [Test plan](docs/test-plan.md), [M5 plan](docs/m5-plan.md), [M6 plan](docs/m6-plan.md)
- [Evaluation log](docs/eval-log.md)
- [Development log](docs/development-log.md)

## License

MIT, see [LICENSE](LICENSE).
