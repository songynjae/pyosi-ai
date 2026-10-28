# Pyosi

Pyosi turns screenshots and rough technical notes into clear, structured, editable visual explanations. Built as a side project for a hackathon submission.

> **Status:** early MVP scaffold. The Generate button shows **mock** annotations only. No AI is integrated yet.

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

1. Click **or use a sample screenshot** or **or use the Floraday fixture** (or upload a PNG/JPEG up to 10 MB).
2. Optionally type some rough notes.
3. Click **Generate**. Numbered callouts and bounding boxes appear over the screenshot, and annotations without a location are listed below it. This is hard-coded mock data (`lib/mock-annotations.ts`) or a manually defined fixture (`lib/fixtures/floraday.ts`).

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
lib/          Types, Zod validation, mock annotation data and fixtures
tests/        Unit tests
docs/         Product brief and development log
public/       Static files, including the sample screenshot
```

## Docs

- [Product brief](docs/product-brief.md)
- [Development log](docs/development-log.md)
