# Claude System Reference (Frontend + Backend)

This document is a handoff/reference for Claude to understand the product goals, core workflows, and key functions across frontend and backend.

## 1) Product Goal

Primary goal: help users analyze large codebases/tasks efficiently while keeping model cost low and suggestions focused.

Core principles:
- Analyze only relevant files when repository input is large.
- Keep suggestions evidence-driven and task-scoped.
- Support both debug workflow and bounty workflow.
- Preserve user intent from task description, task card, direction hints, and extra instructions.

## 2) Data Model (Task/Session)

Main task/session fields (see `schemas/sessions.ts`):
- `title`: task name.
- `task_description`: what to do.
- `direction_hints`: where/how to look.
- `card_content`: issue/task-card text (primary reference).
- `extra_instructions`: user preference constraints (for example: "be minimalist").
- `task_notes`: status notes.
- `artifacts[]`: uploaded files from repo.
- `runs[]`: analysis outputs/history.

## 3) End-to-End Workflow

1. User creates a task from `NewTaskModal`.
2. User uploads repo/files (artifacts).
3. User clicks Analyze in `TaskWorkspaceContent`.
4. If artifact count is large (>100), smart pre-filtering runs:
   - Extract keywords/context from task fields.
   - Rank artifact file paths by relevance.
   - Show top suggestions in `FileSuggestionModal`.
   - User confirms selected files.
5. Backend `/api/analyze` runs Claude analysis with prompt constraints.
6. Results are streamed/stored as a new run and shown in workspace.

## 4) Frontend Responsibilities and Functions

### `components/task-workspace/task-workspace.tsx`

Main orchestration UI.

Key functions:
- `loadSession(id)`: loads task/session data.
- `saveTaskField(field, value)`: saves editable fields (`task_description`, `direction_hints`, `task_notes`, `extra_instructions`).
- `fetchArtifactContent(a)`: fetches full artifact content by hash/ext.
- `handleAnalyze(state, followUpQuestion?)`: executes `/api/analyze` and handles streaming completion/error.
- `handleAnalyzeOrShowFileModal(state, followUpQuestion?)`:
  - If debug mode and artifact count > 100, computes file suggestions with `suggestRelevantFiles(...)`.
  - Also computes conservative new-file suggestions via `suggestNewFiles(...)`.
  - Opens `FileSuggestionModal`.
  - Otherwise runs direct analysis.
- `runAnalysisOnSelectedPaths(selectedPaths)`: combines selected files and runs analysis only on those files.
- `handleAnalyzeMultiple(...)` / `handleAnalyzeSequential(...)`: bulk analysis helpers.

UI sections include:
- Task Card display (`card_content`) above task description.
- Task Description, Direction Hints, Task Notes.
- Extra Instructions editor (affects filtering + prompt behavior).
- Artifact upload, code viewer, evidence panel, run history, bounty panels.

### `components/task/file-suggestion-modal.tsx`

Purpose: user confirmation step before expensive analysis on large repositories.

Inputs:
- `suggestions`: top scored files to modify.
- `newFileSuggestions`: optional conservative suggestions for new files.
- `allPaths`: full list for manual add-more.

Behavior:
- Preselects scored suggestions.
- Allows toggling suggestions.
- Allows adding files from full path list.
- Returns confirmed selected paths via `onConfirm(...)`.

### `components/project/new-task-modal.tsx`

Creates tasks with:
- title
- task description
- direction hints
- task card content (`card_content`)
- extra instructions (`extra_instructions`)

## 5) Smart Filtering Logic

File: `lib/tools/smart-file-filter.ts`

Key exports:
- `extractKeywords(taskDescription, directionHints, cardContent?)`
- `determineContext(keywords)`
- `suggestRelevantFiles(filePaths, taskDescription, directionHints?, cardContent?, options?)`
- `parseExcludeDirsFromHints(directionHints)`
- `suggestNewFiles(taskDescription, cardContent, existingFilePaths)`

Scoring logic in `suggestRelevantFiles(...)`:
- Filename contains keyword: +10
- Card keyword bonus: +2
- Directory matches inferred context: +5
- Extension matches context: +3
- Optional preview keyword hit: +3

Context families:
- Frontend (favicon, icon, UI, render, style, etc.)
- Backend (validation, mempool, consensus, rpc, api, etc.)
- Logging (log/message/LogPrintf patterns)
- Config (config/settings/parameters)

Special handling:
- If exact file path is detected in hints/card text, returns that file directly.
- Supports exclusions from "already tried / skip / exclude" hints.
- Includes fallback suggestions if strict scoring produces no matches.
- In development mode, logs debug filtering metadata/results to console.

## 6) Backend Responsibilities and Functions

### Primary route: `app/api/analyze/route.ts`

Purpose: run analysis in debug or bounty mode and persist run results.

High-level flow:
- Validates `sessionId` and artifact content.
- Saves artifact content by hash.
- Debug mode:
  - boundary scan
  - optional context reduction
  - prompt build (`buildDebugSystemPrompt`)
  - Claude streaming (`streamClaude`) + parse/verification
  - append run to session
- Bounty mode:
  - risk pre-scan
  - bounty prompt build
  - Claude completion + parse
  - append run

Important helpers used:
- `scanArtifact` (boundary scanner)
- `scanForVulnerabilities`
- `reduceContext`
- `buildDebugSystemPrompt`
- `parseClaudeJson`
- `findHallucinationCandidates`

### Session routes

- `app/api/sessions/route.ts`
  - `GET`: list sessions by project
  - `POST`: create session
- `app/api/sessions/[sessionId]/route.ts`
  - `GET`: fetch one session
  - `PATCH`: update task/manual fields
  - `DELETE`: delete session
- `app/api/sessions/[sessionId]/artifacts/route.ts`
  - `POST`: add one/many artifacts
  - `DELETE`: clear all artifacts
- `app/api/sessions/[sessionId]/artifacts/[artifactId]/route.ts`
  - `DELETE`: remove one artifact
- `app/api/sessions/[sessionId]/runs/[runId]/route.ts`
  - `DELETE`: remove one run

### Project/knowledge/taxonomy routes

- `app/api/projects/route.ts`: list/create projects
- `app/api/projects/[projectId]/route.ts`: get/update/delete project
- `app/api/projects/[projectId]/knowledge/route.ts`: list/add knowledge
- `app/api/projects/[projectId]/knowledge/[itemId]/route.ts`: delete knowledge item
- `app/api/projects/[projectId]/knowledge/[itemId]/learning/route.ts`: add learning feedback
- `app/api/projects/[projectId]/taxonomy/*`: symbol/taxonomy operations
- `app/api/projects/[projectId]/bounty-feedback/route.ts`: save bounty feedback
- `app/api/bounty/pre-scan/route.ts`: quick vulnerability pre-scan
- `app/api/artifacts/route.ts`: read artifact by hash/ext
- `app/api/health/anthropic/route.ts`: API health check

## 7) Prompting and Claude Behavior

### `lib/claude/prompt-builder-debug.ts`

`buildDebugSystemPrompt(...)` composes:
- Task Card section (primary reference) when present.
- Extra Instructions section when present.
- Base evidence-first system prompt from `prompt-builder.ts`.
- Analysis principles:
  - minimal changes
  - task-focused edits
  - conservative new-file suggestions
  - actionable file-level output format

### `lib/claude/prompt-builder.ts`

- `buildSystemPrompt(...)`: evidence constraints, taxonomy, context, output schema.
- `buildUserMessage(...)`: user-level analysis request text.

## 8) Storage Functions

Session/project/artifact/knowledge persistence is file-based in `lib/storage/*`.

Main session functions (`lib/storage/sessions.ts`):
- `readSession`, `writeSession`, `createSession`, `listSessionsByProject`
- `appendArtifact`, `removeArtifact`, `clearAllArtifacts`
- `appendRun`, `removeRun`
- `updateTaskFields`, `updateManualGuidance`
- `deleteSession`

## 9) Operational Intent for Claude

When analyzing tasks, Claude should:
- Prioritize `card_content` and `extra_instructions` over broad refactors.
- Recommend minimal, high-confidence file edits.
- Keep suggestions scoped to acceptance criteria.
- Avoid unrelated improvements unless explicitly requested.
- For large artifact sets, rely on smart pre-filtering and user-confirmed file selection before full analysis.

