# Pyosi

Pyosi turns screenshots and rough technical notes into clear, structured, editable visual explanations. Built as a side project for a hackathon submission.

> **Status:** early MVP. Generate sends the screenshot and notes to Meta's Muse Spark through a server-side route (`POST /api/annotate`). Requires `MODEL_API_KEY` in `.env.local`.

## Tech stack

- TypeScript
- Next.js (App Router)
- React
- Node.js runtime for server-side API routes

## Getting started

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Try it

1. In the **Screenshot** area, drop a PNG/JPEG (up to 4 MB) anywhere on the page, paste one from the clipboard (⌘V / Ctrl+V), or click **Choose file**. **New image** clears the image, notes and annotations.
2. Type some rough notes (required, up to 4,000 characters).
3. Click **Generate**. Numbered callouts and bounding boxes appear over the screenshot, and annotations without a location are listed below it. Each Generate sends one request to the model API (costs a few tenths of a cent). Screenshots under 1400 px on the long side are upscaled 2x in the browser first, which gives more accurate boxes.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (includes type checking) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Node's built-in test runner) |

## Data handling

*Snapshot of 2026-10-29, written from reading the code at commit `1181589`. It describes what the app does today; it is not a security review (that is still to do, see "Open items").*

**What the app handles:** a screenshot (PNG or JPEG, up to 4 MB), rough notes (up to 4,000 characters) and the annotations the model returns. Notes in other languages are accepted and the model answers in the language of the notes (a few unit tests and prompt rules cover this), but the evaluation harness and the measured results cover English notes only.

**Where the data goes**

1. **Only in the browser:** showing the screenshot, upscaling or padding the copy that is sent, snapping distance lines to the real edges (reads the image's pixels), editing, and PNG export (drawn in the browser; saved or copied only when the user clicks Download or Copy). None of this uploads anything.
2. **On Generate:** the image (the original, or a 2x / padded PNG copy of it) and the notes are sent to Pyosi's own route `POST /api/annotate`. The route first checks the access code and the call limit (see below), then the size and file type (by magic bytes) and the notes length, then forwards them to the Meta model API (`https://api.meta.ai/v1/chat/completions`, model `muse-spark-1.3`, standard mode; the `-contributor` model, which trains on prompts, is not used). One request per Generate, no automatic retries, 60 s timeout (`MODEL_TIMEOUT_MS` can shorten it; the Netlify deployment uses 50 s).
3. **The answer** comes back to the browser as annotations. Error details from the model API are not forwarded to the browser.

**What Pyosi stores:** nothing. In the app code there is no database, no file writing, no server-side logging, no cookies, no `localStorage` / IndexedDB and no analytics. Everything lives in memory in the open page, so reloading the page clears the image, notes and annotations. The one exception: on a deployment protected by an invitation code, the page keeps that code in the tab's `sessionStorage` so the link's `?code=` is not needed again; it is cleared when the tab is closed.

**Secrets:** the model API key (`MODEL_API_KEY`) is read only on the server, from the environment (`.env.local` locally, which is git-ignored). It is never sent to the browser or included in a response; tests check this with a fake model API.

**Who else sees the data**

- **Meta (model API):** receives the screenshot and the notes of every Generate. How long Meta keeps them is set by Meta's terms, which have not been reviewed yet. Please do not upload confidential or personal information to a demo.
- **The hosting platform (Netlify, once deployed):** may keep request metadata or logs; Pyosi itself logs nothing.
- **Voice input** is not part of the MVP and is not implemented, so no audio is captured or sent anywhere. (If it is added later with the browser's speech recognition, the browser vendor, for example Google in Chrome, would process the audio and Pyosi would not receive or store it.)

**Development:** tests never call the network (the model API is replaced by a fake `fetch`). Live requests cost money and are made only when approved. Test screenshots and raw model responses from experiments are kept outside the repository, on the developer's machine. The only screenshot in the repository is a screenshot of the author's own Floraday web app (`public/fixtures/floraday.png`), cleared for publishing; it is used by the tests and the evaluation cases, not by the app.

**Access control on a public deployment (added 2026-10-29)**

`POST /api/annotate` needs an access code: `ACCESS_CODES` (environment variable, `name:code,name:code`) lists the valid codes, and the page sends the one from the invitation link `https://<site>/?code=<code>` in the `x-access-code` header. Each code and the whole site also have a call limit (`RATE_LIMIT_PER_CODE_PER_HOUR`, default 30; `RATE_LIMIT_TOTAL_PER_DAY`, default 400), counted in memory per server instance, which is a best-effort brake on a serverless host; the model account's own spending limit is the backstop. In production the route refuses everything when `ACCESS_CODES` is not set; `ACCESS_CODES=off` turns the check off (for running a production build on your own machine); in development (`npm run dev`) it is open. The screen tells users that their screenshot and notes are sent to Meta's model API.

**Open items for the security check**

- Meta's retention and training terms for standard-mode requests, to be confirmed from Meta's documentation.
- Hosting platform logging, to be checked on the chosen platform.
- Prompt injection: the notes are fenced as data in the prompt and the model's answer is validated, but this is not a guarantee.
- The call limits are per server instance, not shared across instances.

## Project structure

```
app/          Next.js App Router (layout, page, global styles)
components/   UI components (Workspace, AnnotationOverlay)
lib/          Types, Zod validation, model client, prompts and fixtures
tests/        Unit tests
docs/         Product brief and development log
public/       Static files, including the Floraday test screenshot
```

## Docs

- [Product brief](docs/product-brief.md)
- [Development log](docs/development-log.md)
