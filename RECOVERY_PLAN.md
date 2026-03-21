# BTC-DEBUGGER Recovery Plan (Revised — Safety Requirements)

**Goal:** Restore the project to the closest possible original BTC-DEBUGGER state before the bad ZIP extraction. Recovery only — no redesign, no UX adoption.

**Constraint:** No code or config changes until this revised plan is explicitly approved. Do not delete or overwrite any file in the "uncertain" category without listing it for manual approval.

---

## 1. Confidence levels

Every file classification uses one of:

- **High confidence original** — Clearly part of the pre-merge BTC-DEBUGGER app (layout, AppShell, storage/projects, schemas, analyze flow, task detail, etc.).
- **Likely original** — Strong indicators of original app; low risk to keep.
- **Uncertain** — Could be original or touched by merge; **do not delete or overwrite without explicit manual approval**.

---

## 2. File classification with confidence

### A) Canonical original BTC-DEBUGGER (KEEP)

| File / set | Confidence | Notes |
|------------|------------|--------|
| `app/layout.tsx` (AppShell, Junior Developer Task Manager) | **High** | Single root layout; AppShell is used nowhere else. |
| `app/page.tsx` (home with View Projects) | **High** | Only non-(2) home page. |
| `app/globals.css` (@tailwind base/components/utilities + :root vars) | **High** | Only non-(2) global CSS; layout imports it. |
| `app/notes/page.tsx`, `notes-client.tsx` | **High** | Client-side notes; no server Sidebar wrapper. |
| `app/projects/page.tsx`, `projects-client.tsx`, `new/page.tsx` | **High** | Client projects list; matches API usage. |
| `app/projects/[id]/page.tsx`, `project-detail-client.tsx` | **High** | Fetches `/api/projects/${id}` and expects `{ success, data }`. |
| `app/projects/[id]/learnings/page.tsx` | **High** | Fetches `/api/projects/${projectId}/learnings` (projectId = params.id). |
| `app/projects/[id]/tasks/[taskId]/page.tsx`, `task-detail-client.tsx`, `architecture/page.tsx` | **High** | Full task UI and analyze flow. |
| `app/api/projects/route.ts` (readProjects, createProject, ok/err, log) | **High** | Uses storage/projects and schemas; matches frontend. |
| `app/api/projects/[id]/notes/*`, `[id]/tasks/*`, `[id]/tasks/[taskId]/*` | **High** | Only dynamic project API under `[id]`. |
| All `app/api/notes/*`, `app/api/tasks/*`, `app/api/me`, `app/api/health/*` | **High** | No (2) or projectId route duplication. |
| `components/layout/app-shell.tsx` | **High** | Only layout shell; imports `@/components/sidebar/sidebar`. |
| `components/sidebar/sidebar.tsx` | **High** | Only sidebar used by app-shell (see evidence below). |
| `components/ui/*`, `components/dialogs/*`, `components/project/*`, `components/tasks/*`, `components/taxonomy/*`, `components/collapsible-section.tsx` | **High** | Referenced by canonical pages only. |
| `lib/*` (utils, utils/cn, types, storage, storage/*, api-types, logger, auth, prisma, claude, prompts, tools) | **High** | Used by canonical app and API routes. |
| `schemas/*`, `data/projects.json`, `config/*`, `public/*`, `tests/*` | **High** | Data and config for the app. |
| `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.mjs`, `components.json`, `prisma/schema.prisma` | **Likely** | Standard config; no (2) duplicates for tsconfig/next-env. |

### B) Polluted / imported (candidates for removal)

| File | Confidence | Evidence |
|------|------------|----------|
| `app/api/projects/route (2).ts` | **High** | Uses `getProjects`/`createProject` from `@/lib/storage` and returns `{ projects }`/`{ project }`. Canonical `route.ts` uses `readProjects`/`createProject` from `@/lib/storage/projects` and `ok`/`err`. No source file references the string `"route (2)"` or imports it. |
| `postcss.config.mjs` | **Likely** | Contains only `plugins: ["@tailwindcss/postcss"]` (Tailwind v4). See §6 for full CSS/tooling inspection before any change. |

### C) Duplicate "(2)" files (candidates for deletion — see evidence per file)

| File | Confidence | Evidence / usage |
|------|------------|-------------------|
| `package (2).json` | **High** | Name "ai-project"; duplicate of root package concept. No script or config in repo references `"package (2).json"` (grep: no matches). |
| `tsconfig (2).json` | **High** | Duplicate. Tooling uses `tsconfig.json`; no reference to "(2)" in source. |
| `next-env.d (2).ts` | **High** | Duplicate. TypeScript/Next use `next-env.d.ts`; no reference to "(2)" in source. |
| `lib/utils (2).ts` | **High** | Same `cn()` as `lib/utils.ts`. Codebase imports `@/lib/utils` or `@/lib/utils/cn`; no import of `utils (2)` (grep: no matches). |
| `app/page (2).tsx` | **High** | Redirect-only home. Next serves `app/page.tsx` for `/`; "(2)" is not a route. No imports of "page (2)". |
| `app/layout (2).tsx` | **High** | Geist, "Create Next App". Root layout is `app/layout.tsx`; no imports of "layout (2)". |
| `app/globals (2).css` | **High** | Tailwind v4 theme. Only `app/globals.css` is imported (by layout). No imports of "globals (2)". |
| `app/notes/page (2).tsx` | **High** | Server + Sidebar layout. Canonical notes is `app/notes/page.tsx`. No imports of "page (2)". |
| `app/projects/page (2).tsx` | **High** | Same as above for projects. No imports of "page (2)". |
| `app/projects/[id]/page (2).tsx` | **High** | Same for project detail. No imports of "page (2)". |
| `app/projects/[id]/tasks/[taskId]/page (2).tsx` | **High** | Same for task detail. No imports of "page (2)". |
| `data/projects (2).json` | **Likely** | Sample data; canonical is `data/projects.json`. Storage code reads `projects.json`; no reference to "projects (2)" in source. |

### D) components/sidebar.tsx (root) — orphan check

**Requirement:** Prove it is orphaned before listing for deletion.

**Import search:**  
Grep for `from ['"]@/components/sidebar['"]` or `from ['"]@/components/sidebar/` (and equivalent):

- `app/notes/page (2).tsx` → `import { Sidebar } from '@/components/sidebar';`
- `app/projects/page (2).tsx` → `import { Sidebar } from '@/components/sidebar';`
- `app/projects/[id]/page (2).tsx` → `import { Sidebar } from '@/components/sidebar';`
- `app/projects/[id]/tasks/[taskId]/page (2).tsx` → `import { Sidebar } from '@/components/sidebar';`
- `components/layout/app-shell.tsx` → `import { Sidebar } from "@/components/sidebar/sidebar";`

**Conclusion:**  
The only import of `@/components/sidebar` (no trailing path) is from the four **(2)** pages. The canonical layout uses `@/components/sidebar/sidebar`. Therefore, after deletion of the four "(2)" pages, **no file will import root `components/sidebar.tsx`** → it becomes an orphan.

**Confidence:** **High** that root `components/sidebar.tsx` is safe to delete **only after** the four "(2)" page files above are deleted.

### E) [projectId] route tree — reference check before deletion

**Requirement:** Prove there are no remaining references that depend on the *route segment name* [projectId].

**URL usage (all canonical):**

- `app/projects/[id]/page.tsx`: `fetch(\`/api/projects/${encodeURIComponent(projectId)}\`)`, `fetch(\`/api/projects/${encodeURIComponent(projectId)}\`, { method: "DELETE" })`, PATCH same path. Variable `projectId` holds `params.id`.
- `app/projects/[id]/learnings/page.tsx`: `fetch(\`/api/projects/${encodeURIComponent(projectId)}/learnings\`)` (projectId = params.id).
- `app/projects/projects-client.tsx`: `fetch(\`/api/projects/${projectId}\`, { method: 'DELETE' })`.
- `app/projects/[id]/project-detail-client.tsx`, `task-detail-client.tsx`: various `fetch(\`/api/projects/${project.id}/...\`)`.

**Finding:**  
All calls use the **URL path** `/api/projects/:id` or `/api/projects/:id/learnings`. No source references the literal folder name `[projectId]`. In Next.js, both `[id]` and `[projectId]` would match the same path; the app does not care which segment name is used as long as the handler exists.

**Conclusion:**  
If we **keep** `[id]` and **add** `[id]/learnings/route.ts` with the same behavior as `[projectId]/learnings/route.ts`, and **replace** `[id]/route.ts` with the logic of `[projectId]/route.ts` (param `id`), then deleting the `[projectId]` folder does not break any reference: the same URLs continue to be handled.

**Confidence:** **High** that deleting `[projectId]` is safe **after** the route consolidation in §3 is done.

---

## 3. Uncertain files (do NOT delete/overwrite without manual approval)

| File | Reason |
|------|--------|
| `package.json` | Name and deps may have been overwritten by merge. Changing name or deps is a restore/change; do not overwrite blindly. Recommend minimal edits in §6 only after inspection. |
| `package-lock.json` | Single lockfile present; do not delete. If `package-lock (2).json` exists, treat as uncertain before deletion (not found in current glob). |
| `postcss.config.js` | May be original or from imported project. Do not delete until §6 inspection is done and minimal recommendation is approved. |
| `tailwind.config.ts` | Same as above. |
| `lib/prisma.ts` | Imports `./generated/prisma`. Do not change unless Prisma is part of an approved recovery step. |
| Any file not explicitly listed in §2 as "High" or "Likely" for delete/change | Treat as **uncertain**; list for manual approval before any delete or overwrite. |

---

## 4. Pre-deletion reference evidence (by file)

Before deleting any of the following, the evidence is as stated. If anything in the repo references a "(2)" path or the root sidebar by string, re-run the same searches and update this section.

| File to delete | Reference evidence | Unused? |
|----------------|--------------------|--------|
| `package (2).json` | No reference in source to `"package (2).json"`. npm/Next use `package.json`. | Yes |
| `tsconfig (2).json` | No reference to `"tsconfig (2)"`. Tooling uses `tsconfig.json`. | Yes |
| `next-env.d (2).ts` | No reference to `"next-env.d (2)"`. TS uses `next-env.d.ts`. | Yes |
| `lib/utils (2).ts` | No import path contains `utils (2)`. All imports use `@/lib/utils` or `@/lib/utils/cn`. | Yes |
| `app/page (2).tsx` | No import of this file. Next routing uses `app/page.tsx`. | Yes |
| `app/layout (2).tsx` | No import of this file. Root layout is `app/layout.tsx`. | Yes |
| `app/globals (2).css` | No import of this file. Layout imports `./globals.css`. | Yes |
| `app/notes/page (2).tsx` | No import of this file. Route `/notes` is served by `app/notes/page.tsx`. | Yes |
| `app/projects/page (2).tsx` | No import of this file. Route `/projects` is served by `app/projects/page.tsx`. | Yes |
| `app/projects/[id]/page (2).tsx` | No import of this file. Route is served by `app/projects/[id]/page.tsx`. | Yes |
| `app/projects/[id]/tasks/[taskId]/page (2).tsx` | No import of this file. Route is served by non-(2) page. | Yes |
| `app/api/projects/route (2).ts` | No import of this file. API uses `app/api/projects/route.ts`. | Yes |
| `data/projects (2).json` | Storage reads `projects.json`; no code path references `"projects (2).json"`. | Yes |
| `postcss.config.mjs` | No source references this filename. Next/PostCSS may load it depending on resolution order. See §6. | Yes, for removal only after §6 approval |
| `components/sidebar.tsx` | Only importers: the four "(2)" pages listed in §2.D. After their deletion, no importers. | Yes, after (2) pages deleted |
| `app/api/projects/[projectId]/route.ts` | No reference to segment name "projectId" in URLs; URLs use id value. Safe to remove after [id] consolidation. | Yes, after consolidation |
| `app/api/projects/[projectId]/learnings/route.ts` | Same as above. | Yes, after [id]/learnings added |

---

## 5. Dry-run impact report

### Broken imports expected after deletion

- **None** from the canonical codebase. No canonical file imports any "(2)" file or the root `components/sidebar.tsx`.  
- **If** `components/sidebar.tsx` were deleted **before** the four "(2)" pages: the four "(2)" pages would have broken imports. So delete those four pages first, then delete `components/sidebar.tsx`.

### Files that will need import path updates

- **None.** No canonical file points at deleted paths.

### Routes / components / pages affected

- **Routes:** No canonical route is removed. Deleting "(2)" pages does not change which routes exist (Next uses the non-(2) pages).  
- **Components:** Only `components/sidebar.tsx` is removed; it is unused after (2) page deletion.  
- **API routes:** Removing `[projectId]` and consolidating under `[id]` keeps the same URLs working; no frontend path changes needed.  
- **Build:** After recovery, `package.json` and possibly PostCSS/Tailwind config or deps may need minimal edits (§6). Running `npm install` (and if needed `npx prisma generate`) may be required.

---

## 6. Package.json and CSS tooling (no assumption — inspect first)

**Requirement:** Do not assume Tailwind v3 is correct. Inspect, then recommend minimal dependency/config restoration. Do not add dependencies unless actually imported or required by the active config.

### 6.1 Inspection

**app/globals.css**

- Lines 1–3: `@tailwind base;` `@tailwind components;` `@tailwind utilities;`
- Rest: `:root` CSS variables, `body`, `.session-chat-area` and keyframes.
- **Conclusion:** Uses Tailwind **directive** syntax (`@tailwind base/components/utilities`). This is the syntax supported by **Tailwind v3**. Tailwind v4 uses `@import "tailwindcss"` (or similar) and does not use these three directives in the same way.

**postcss.config.js**

- Content: `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`
- **Conclusion:** Expects a `tailwindcss` plugin (v3-style) and `autoprefixer`. No version in file. This matches a Tailwind v3 + PostCSS setup.

**postcss.config.mjs**

- Content: `const config = { plugins: ["@tailwindcss/postcss"] }; export default config;`
- **Conclusion:** Tailwind v4 only. Incompatible with `app/globals.css` as written (v3 directives). If Next resolves `.mjs` and uses this, and `globals.css` is unchanged, CSS can fail or behave unexpectedly.

**tailwind.config.ts**

- Content: `content: ["./pages/**/*...", "./components/**/*...", "./app/**/*..."], theme: { extend: {} }, plugins: []`.
- **Conclusion:** Standard Tailwind config (v3-style). No v4-specific API.

**Actual imports in the codebase (source only, excluding node_modules)**

- No file in `app/` or `components/` or `lib/` imports `tailwindcss`, `autoprefixer`, or `@tailwindcss/postcss` by name.  
- Build/tooling loads PostCSS config and Tailwind via config files and `app/globals.css` import in layout.

**Current package.json (relevant parts)**

- `"name": "ai-project"` — not btc-debugger.
- No `marked`, `zod`, or `@anthropic-ai/sdk` in dependencies.
- devDependencies: `"@tailwindcss/postcss": "^4"`, `"tailwindcss": "^4"`. No `autoprefixer` or `postcss` in package.json (they may be transitive).

**Actual runtime imports (for dependency list)**

- `marked`: `app/notes/page.tsx`, `app/projects/[id]/tasks/[taskId]/page.tsx`
- `zod`: `schemas/tasks.ts`, `schemas/projects.ts`, `schemas/notes.ts`
- `@anthropic-ai/sdk`: `app/api/health/anthropic/route.ts`, `lib/claude/client.ts`

So the app **does** require `marked`, `zod`, and `@anthropic-ai/sdk` for build/runtime. They are currently missing from package.json.

### 6.2 Minimal recommendation (only after approval)

- **package.json**
  - Change `"name"` to `"btc-debugger"` (restore project identity).
  - **Add** only dependencies that are actually imported: `marked`, `zod`, `@anthropic-ai/sdk` (versions compatible with existing code).
  - **Do not** assume Tailwind v3 yet for the recovery plan text; see below.

- **Tailwind/PostCSS (minimal, evidence-based)**
  - `app/globals.css` is unchanged and uses `@tailwind base/components/utilities` → that syntax is Tailwind v3. So **if** we keep `globals.css` as-is, the build **must** use a Tailwind that supports these directives (i.e. v3, or a compatibility layer).  
  - `postcss.config.js` already references `tailwindcss` and `autoprefixer`. For that to work, package.json must have:
    - a `tailwindcss` version that supports the directive syntax (v3), and
    - `autoprefixer` (and typically `postcss`) as devDependencies.
  - **Minimal config restoration:**  
    - So that **only** `postcss.config.js` is used (and not `postcss.config.mjs`), **remove** `postcss.config.mjs` (so the only PostCSS config is the one that matches `globals.css`).  
    - In package.json, ensure: `tailwindcss` (v3), `autoprefixer`, and `postcss` in devDependencies; remove `@tailwindcss/postcss` and Tailwind v4 if present.  
  - **Do not add** any other CSS-related dependency unless required by this minimal setup.

- **Uncertain:** If you prefer not to change Tailwind version in this recovery, list "Tailwind/PostCSS version and postcss.config.mjs removal" as **manual approval** and do not change package.json devDependencies or delete postcss.config.mjs until approved.

---

## 7. Recovery actions (apply only after approval)

### 7.1 Safe to delete (after approval)

- All "(2)" files listed in §2.C and §4, in an order that preserves the orphan proof: e.g. delete the four `app/**/page (2).tsx` files first, then `components/sidebar.tsx`, then the rest of the "(2)" list.
- `postcss.config.mjs` — only after §6 (and optional Tailwind v3) is approved.
- `app/api/projects/[projectId]/route.ts` and `app/api/projects/[projectId]/learnings/route.ts` — only after adding `app/api/projects/[id]/learnings/route.ts` and replacing `app/api/projects/[id]/route.ts` with the [projectId] logic (param `id`).

### 7.2 Do not delete or overwrite without explicit manual approval

- Any file in the "uncertain" list (§3).
- `package.json` — only apply the minimal edits agreed in §6 (name + deps that are actually imported; Tailwind/PostCSS only if approved).
- `postcss.config.js`, `tailwind.config.ts` — do not delete; change only if §6 recommendation is approved.

### 7.3 Restore / change (only after approval)

- **package.json:** name `btc-debugger`; add `marked`, `zod`, `@anthropic-ai/sdk`; Tailwind/PostCSS changes per §6 if approved.
- **app/api/projects/[id]/route.ts:** Replace body with logic from `[projectId]/route.ts` (param `id`), so GET/PATCH/DELETE and response shapes stay correct.
- **app/api/projects/[id]/learnings/route.ts:** Create (from `[projectId]/learnings/route.ts`, param `id`).

---

## 8. Summary

- **Confidence:** All classifications above are tagged High / Likely / Uncertain. Nothing in "uncertain" is to be deleted or overwritten without explicit manual approval.
- **Evidence:** §4 and §2.D–E provide reference evidence and orphan/projectId checks.
- **Dry-run:** §5 states no broken imports or path updates in canonical code; only sidebar and (2) pages ordering matters for deletion.
- **CSS/deps:** §6 inspects globals.css, both PostCSS configs, tailwind.config.ts, and imports; recommends minimal restoration and does not assume Tailwind v3 until evidence is stated.
- **Code changes:** Apply only after this revised plan is approved.

**Do not apply the recovery plan until the user approves this revised plan.**
