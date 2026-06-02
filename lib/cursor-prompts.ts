/**
 * Prompts for Cursor repo scan (copy into Cursor to analyze the repo).
 */

import type { Task } from "@/schemas/tasks";

/** Generic repo scan prompt — use once per project, paste result into project Repo scan */
export function generateGenericRepoScanPrompt(): string {
  return `You are a code analysis assistant.

YOUR ROLE:
Scan and analyze this repository. Do NOT make any code changes or modifications.

Produce a concise but complete overview in plain text, structured as below.

REPOSITORY PURPOSE & ROLE
- What is this repo for? What problem does it solve or what product does it support?
- Main user-facing or business-facing responsibilities of the codebase.

LANGUAGES & RUNTIME
- Primary languages and any secondary ones.
- Runtime or platform (browser, Node, mobile, etc.) if inferable.

FRAMEWORKS & BUILD
- Frameworks (e.g. Next.js, React, Express).
- Build tool or bundler, package manager if visible.

DIRECTORY & FILE STRUCTURE
- Top-level layout: main folders and what each is for.
- Where application code lives vs config, static assets, tests, scripts.

KEY FILES & ENTRY POINTS
- App entry points, main config files, routing or API entry if applicable.

DEPENDENCIES & LIBRARIES
- Important external packages and what they are used for (briefly).
- Notable versions if visible in package manifests.

PATTERNS
- How the code is organized (layers, features, etc.).
- Routing/API or data flow patterns if applicable.

CRITICAL: Do not modify any files. Scan and report only.`;
}

export type TaskOnlyPromptInput = {
  title: string;
  rawInput: string;
  /** High-level goal or outcome when known (e.g. from saved understanding). */
  goal?: string;
  /** Optional acceptance criteria or definition of done from the ticket. */
  acceptanceCriteria?: string;
};

/**
 * Task-only prompt for Cursor — ticket / description / goal without repo structure.
 * Assumes repo context is provided separately (e.g. project Repo scan).
 */
export function generateTaskOnlyPrompt(input: TaskOnlyPromptInput): string {
  const title = input.title.trim() || "Untitled task";
  const body = input.rawInput.trim() || "(No description provided.)";
  const goal = input.goal?.trim();
  const ac = input.acceptanceCriteria?.trim();

  const lines: string[] = [
    "You are assisting with a single development task. Repo-wide context is provided separately; do not ask for a full repository tour.",
    "",
    "TASK TITLE:",
    title,
    "",
    "TASK DESCRIPTION / TICKET:",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    body,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  if (goal) {
    lines.push("", "GOAL / OUTCOME TO ACHIEVE:", goal);
  }
  if (ac) {
    lines.push("", "ACCEPTANCE CRITERIA / DEFINITION OF DONE:", ac);
  }

  lines.push(
    "",
    "YOUR ROLE:",
    "Produce task-scoped repo grounding for the in-app Task Helper (Claude) analysis.",
    "",
    "Investigate the repository ONLY as it relates to this specific task. Output concrete findings (answers), not questions.",
    "",
    "Return, in plain text, these sections:",
    "- Relevant files & locations: exact paths and the specific functions/components/routes/configs involved.",
    "- Current behavior: what the code does today in those places (task-relevant only).",
    "- Constraints & dependencies: any task-relevant constraints, patterns, or coupling that will affect the change (task-scoped only).",
    "- Suggested implementation surface: the smallest set of files that likely need edits for this task.",
    "",
    "Hard rules:",
    "- Do NOT ask the user clarifying questions; if info is missing, state assumptions you are making and proceed with best-effort task-scoped grounding.",
    "- Do NOT repeat or summarize general repo structure, folder layout, or tech stack unless this ticket explicitly asks for it.",
    "- Do NOT propose unrelated improvements, refactors, or broad repo tours.",
    "- Do NOT write or modify code; scan and report only."
  );

  return lines.join("\n");
}

/** Convenience wrapper when a saved task record is available. */
export function generateTaskOnlyPromptFromTask(
  task: Pick<Task, "title" | "raw_input" | "understanding">
): string {
  return generateTaskOnlyPrompt({
    title: task.title,
    rawInput: task.raw_input,
    goal: task.understanding?.high_level_goal?.trim() || undefined,
  });
}

/** Task-aware repo scan prompt — use when creating a task; paste result in project Repo scan or in task's optional field */
export function generateTaskAwareRepoScanPromptFromDraft(
  title: string,
  rawInput: string
): string {
  return `You are a code analysis assistant helping with the following task:

TASK: ${title}

TASK CARD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rawInput}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR ROLE:
Scan and analyze the project structure ONLY in relation to this task.
Do NOT make any code changes or modifications.

GENERIC REPOSITORY ANALYSIS:

Project type & language
- What programming language(s)?
- What framework(s)?
- Build system?

Directory structure
- Main directories and their purposes
- Where is relevant code for this task likely located?

Key files & entry points
- Main entry point files
- Configuration files
- Files related to this specific task

Dependencies
- External libraries/packages
- Versions (if visible)

Code patterns
- How is code organized?
- Routing/API structure (if applicable)
- Common patterns used

Existing features
- Current implementation of related features
- Where similar functionality exists

TASK-SPECIFIC ANALYSIS:
Based on the task card above:
- Which files will likely need modification?
- Which directories are most relevant?
- Are there existing patterns I should follow?
- Any dependencies I need to know about?
- Potential conflicts or risks?

CRITICAL: DO NOT make any changes. Scan and report only.
Provide analysis in plain text, structured format.`;
}
