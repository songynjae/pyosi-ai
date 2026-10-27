# CLAUDE.md

## Project
Pyosi is an AI-powered visual explanation tool. Users upload a screenshot and rough technical notes; Pyosi produces numbered callouts and bounding boxes with short explanations. It is a side project aimed at a hackathon submission, with a 10-day MVP deadline (started 2026-10-27). Primary users are engineers; this is an unvalidated assumption. See `docs/product-brief.md`.

## Stack
TypeScript, Next.js (App Router), React, Node.js runtime for API routes. npm. Plain CSS modules, no UI library.

## Commands
- `npm run dev`: dev server at http://localhost:3000
- `npm run lint`: ESLint
- `npx tsc --noEmit`: type check (run `npx next typegen` first on a fresh checkout)
- `npm run build`: production build

## Current state
- Implemented: single-page UI with upload, notes, Generate, preview, and **mock** annotations.
- Not implemented: AI integration, annotation editing, PNG export. Do not add these unless asked.

## Guidelines
- Keep the architecture minimal; the deadline matters more than polish. Avoid new dependencies unless clearly needed.
- Clearly mark mock functionality in code (comments starting with `MOCK`) and in docs.
- Annotation boxes are percentages (0-100) of the image size. See `lib/types.ts`.
- Never commit secrets. API keys go in `.env.local` (git-ignored); read them only in server code (API routes), never in client components.
- Next.js here is a recent major version. Check `node_modules/next/dist/docs/` before relying on older conventions.
- Update `docs/development-log.md` when finishing a meaningful piece of work.
