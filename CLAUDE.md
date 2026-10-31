# CLAUDE.md

## Project
Pyosi is an AI-powered visual explanation tool. Users upload a screenshot and rough technical notes; Pyosi produces numbered callouts and bounding boxes with short explanations. It is a side project aimed at a hackathon submission, with a submission deadline of 2026-11-04 21:00 ET (Wednesday; started 2026-10-27). Feature freeze: Friday 2026-10-30; Saturday to Tuesday is buffer with no new features. Primary users are engineers; this is an unvalidated assumption. See `docs/product-brief.md`.

## Stack
TypeScript, Next.js (App Router), React, Node.js runtime for API routes. npm. Plain CSS modules, no UI library.

## Commands
- `npm run dev`: dev server at http://localhost:3000
- `npm run lint`: ESLint
- `npm test`: unit tests (Node's built-in runner; test files import with `.ts` extensions)
- `npx tsc --noEmit`: type check (run `npx next typegen` first on a fresh checkout)
- `npm run build`: production build

## Current state
- Implemented: single-page UI (Screenshot section with drop / paste / Choose file, notes, Generate, boxes and numbered callouts over the image, annotation list), AI annotations via `POST /api/annotate` (Meta `muse-spark-1.3`, standard mode), box editing (move, resize, delete, label and description text), PNG export (download and copy, at the original image size, never the upscaled copy), distance lines for spacing notes with pixel snapping, the evaluation harness (`npm run eval`, `eval/`, `scripts/eval.mjs`; distance cases D1-D10 and the set from the previous discovery project (`--set previous`)), access control and call limits (`lib/access.ts`), a hard cap on all model requests (`lib/budget.ts`, needs `TOTAL_REQUEST_CAP`), and a Netlify deployment (`netlify.toml`).
- Nothing else is planned before the deadline (2026-11-04 21:00 ET): the feature freeze is 2026-10-30; the rest is preparing the submission (README, LICENSE, the demo video and the form answers). Do not add features unless asked.
- Environment variables (names only): `MODEL_API_KEY`, `ACCESS_CODES` (`ACCESS_CODES=off` for a local production build), `RATE_LIMIT_TOTAL_PER_DAY`, `RATE_LIMIT_PER_CODE_PER_HOUR`, `MODEL_TIMEOUT_MS`, `TOTAL_REQUEST_CAP`, `BUDGET_EPOCH`.

## Architecture
- Flow: browser -> `POST /api/annotate` (`app/api/annotate/route.ts` -> `lib/annotate-handler.ts`, with the access guard from `lib/access.ts` first and the request cap from `lib/budget.ts` just before the paid call) -> `lib/meta-client.ts` -> Meta chat completions. The route checks image size and magic bytes (PNG/JPEG, 4 MB; the deployment host takes about 4.5 MB per request) and notes (1-4000 chars) before any model call. One request per Generate, no automatic retries.
- Prompt and response schema: `lib/prompts/annotate.ts` (`PROMPT_VERSION`; bump it when the wording changes). Distance notes (gap between elements, or an element's width/height) come back as `kind: "measure"` entries that name items of a top-level `groups` row/column (tight boxes for every item, located once); `lib/spacing.ts` (`resolveMeasure`) computes the gap between the named items and `lib/model-output.ts` stores it as a box plus `kind`/`axis`/`value`. Descriptions restate the notes directly ("This icon needs to be revised."), never "the notes say". A question in the notes stays a question; label and description are written in the notes' language (Korean in the polite 합니다체) and keep the notes' tone.
- Coordinates: the model answers `[x_min, y_min, x_max, y_max]` on a 0-1000 grid (top-left origin); `lib/grounding.ts` converts to the percent boxes above, and `lib/model-output.ts` validates with `parseAnnotations()`. Pixel output was compared and was not more accurate.
- Images under 1400 px on the long side are upscaled 2x in the browser before sending (`lib/upscale.ts`); this gave far more accurate boxes. Images wider than 2.5:1 also get white padding below, up to 2:1, and phone-shaped images between 2:1 and 3:1 tall get white padding on the right up to a square (`lib/pad-aspect.ts`), and the returned boxes are mapped back. Only the copy sent to the model is upscaled or padded. After the response, distance lines are snapped to the real gap in the original image's pixels (`lib/refine-gap.ts`, client side); when the image is not plain enough to be sure, the model's values are kept.
- `MODEL_API_KEY` (in `.env.local`) is read only in the route. Use the standard model, not `-contributor` (Meta trains on contributor-mode prompts).
- Numbered badge: boxes under 10% in either direction put it above the box (`lib/badge-placement.ts`).
- `spikes/m2-2b/run.mjs`: the one-request grounding spike (dry run by default, `--send` makes a live request).

## Guidelines
- Keep the architecture minimal; the deadline matters more than polish. Avoid new dependencies unless clearly needed.
- Tests never call the network: the model API is replaced by a fake `fetch`. Live requests cost money and need the user's approval.
- With `cacheComponents` enabled, route handlers cannot export `runtime`.
- Annotation boxes are percentages (0-100) of the image size and are `null` unless status is `found`. Validate with `parseAnnotations()` in `lib/annotation-schema.ts`; invalid entries are reported, never clamped or turned into `not_found`. See `lib/types.ts`.
- Never commit secrets. API keys go in `.env.local` (git-ignored); read them only in server code (API routes), never in client components.
- Next.js here is a recent major version. Check `node_modules/next/dist/docs/` before relying on older conventions.
- Update `docs/development-log.md` when finishing a meaningful piece of work.
