import type { TaskUnderstanding } from "@/schemas/tasks";

export function buildPhase2Prompt(
  rawInput: string,
  understanding: TaskUnderstanding,
  clarifications: string[],
  cursorRepoAnalysis?: string
): string {
  const clarificationSection =
    clarifications.length > 0
      ? `
USER REQUESTED CLARIFICATIONS ON:
${clarifications.map((c) => `- ${c}`).join("\n")}

You MUST include detailed clarifications for each concept.
`
      : "";
  const cursorRepoAnalysisSection =
    typeof cursorRepoAnalysis === "string" && cursorRepoAnalysis.trim().length > 0
      ? `
CURSOR REPO ANALYSIS:
The user ran a repo scan with Cursor AI. Here are the relevant files found:
${cursorRepoAnalysis}

Use this information when determining which files to modify.
`
      : "";

  return `You are building detailed architecture for a junior developer.

TASK CARD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rawInput}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPROVED UNDERSTANDING:
${JSON.stringify(understanding, null, 2)}

${clarificationSection}
${cursorRepoAnalysisSection}

Output as JSON:
{
  "clarifications": [
    {
      "concept": "OpenAPI",
      "explanation": "Full detailed explanation...",
      "context_in_task": "How it relates to this task..."
    }
  ],
  "detailed_breakdown": "Full markdown with step-by-step implementation",
  "file_modifications": [
    {
      "path": "path/to/file.ext",
      "changes_needed": "What to change..."
    }
  ],
  "testing_steps": ["Step 1", "Step 2"],
  "edge_cases": ["Case 1", "Case 2"],
  "estimated_time": "X-Y hours"
}

CRITICAL:
- Be VERY detailed in implementation steps
- Beginner-friendly explanations
- Clarifications must be thorough

OUTPUT ONLY JSON. DO NOT include markdown code fences.
DO NOT include any preamble or explanation.
ONLY output the JSON object.
Do not include any text before "{" or after "}".
Ensure all JSON strings are properly escaped.
Do not use single quotes in JSON, only double quotes.

Expected JSON shape example:
{
  "clarifications": [
    {
      "concept": "OpenAPI",
      "explanation": "Explanation text",
      "context_in_task": "How it applies"
    }
  ],
  "detailed_breakdown": "# Task Architecture\\n\\n## Detailed Implementation Plan\\n...",
  "file_modifications": [
    { "path": "src/example.ts", "changes_needed": "Describe exact edit" }
  ],
  "testing_steps": ["Step 1", "Step 2"],
  "edge_cases": ["Case 1", "Case 2"],
  "estimated_time": "2-4 hours"
}`;
}
