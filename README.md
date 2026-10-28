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

1. Click **or use the Floraday sample** (or upload a PNG/JPEG up to 10 MB).
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

## Project structure

```
app/          Next.js App Router (layout, page, global styles)
components/   UI components (Workspace, AnnotationOverlay)
lib/          Types, Zod validation, model client, prompts and fixtures
tests/        Unit tests
docs/         Product brief and development log
public/       Static files, including the Floraday sample
```

## Docs

- [Product brief](docs/product-brief.md)
- [Development log](docs/development-log.md)
