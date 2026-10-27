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

1. Click **or use a sample screenshot** (or upload your own image).
2. Optionally type some rough notes.
3. Click **Generate**. Three numbered callouts and bounding boxes appear over the screenshot. This is hard-coded mock data (`lib/mock-annotations.ts`).

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (includes type checking) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project structure

```
app/          Next.js App Router (layout, page, global styles)
components/   UI components (Workspace, AnnotationOverlay)
lib/          Types and mock annotation data
docs/         Product brief and development log
public/       Static files, including the sample screenshot
```

## Docs

- [Product brief](docs/product-brief.md)
- [Development log](docs/development-log.md)
