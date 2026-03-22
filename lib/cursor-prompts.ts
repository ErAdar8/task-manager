/**
 * Prompts for Cursor repo scan (copy into Cursor to analyze the repo).
 */

/** Generic repo scan prompt — use once per project, paste result into project Repo scan */
export function generateGenericRepoScanPrompt(): string {
  return `You are a code analysis assistant.

YOUR ROLE:
Scan and analyze this repository's structure. Do NOT make any code changes or modifications.

GENERIC REPOSITORY ANALYSIS:

Project type & language
- What programming language(s)?
- What framework(s)?
- Build system?

Directory structure
- Main directories and their purposes
- Where is application code vs config vs tests?

Key files & entry points
- Main entry point files
- Configuration files
- Key modules

Dependencies
- External libraries/packages
- Versions (if visible)

Code patterns
- How is code organized?
- Routing/API structure (if applicable)
- Common patterns used

CRITICAL: DO NOT make any changes. Scan and report only.
Provide analysis in plain text, structured format.`;
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
