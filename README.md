# Task Helper

Local Next.js app for planning and tracking development tasks with Claude-assisted analysis.

## Prompt system

Claude uses two canonical prompt sources at the repository root:

- `understanding-execution.md` — **Execute** flow: break work into topic cards and paste-ready mini prompts.
- `understanding-learning.md` — **Deep understanding** flow: teach concepts, reading order, and pitfalls before implementation.

These files are read at runtime (with caching on file mtime) by:

- `lib/prompts/analyze-execute.ts` → `GET`/`POST` handlers use `/api/tasks/[taskId]/analyze-execute`
- `lib/prompts/analyze-understand.ts` → `/api/tasks/[taskId]/analyze-understand`

Edit the `.md` files to change behavior; the next API call picks up changes after the file is saved.

Shared HTTP logic lives in `lib/task-analyze-claude.ts`. Cursor “copy this prompt” helpers for repo scans are in `lib/cursor-prompts.ts` (not used as Claude system prompts).

## Environment

- `ANTHROPIC_API_KEY` — required for analysis routes  
- Optional: `ANTHROPIC_MODEL_OVERRIDE` — if set, used for both flows instead of Opus (execute) / Sonnet (understand) defaults in `lib/analysis/resolve-model.ts`

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```
