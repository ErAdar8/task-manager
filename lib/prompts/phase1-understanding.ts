export function buildPhase1Prompt(rawInput: string, cursorRepoScan?: string): string {
  const cursorRepoScanSection =
    typeof cursorRepoScan === "string" && cursorRepoScan.trim().length > 0
      ? `
CURSOR TASK-AWARE REPOSITORY SCAN:
The user already analyzed the repository for this task. Use this context to improve accuracy:
${cursorRepoScan}
`
      : "";
  return `You are helping a junior developer understand their task.

TASK CARD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rawInput}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${cursorRepoScanSection}

Output as JSON:
{
  "high_level_goal": "2-3 sentences in simple language",
  "why_this_matters": "1-2 sentences",
  "major_steps": [
    "Step 1",
    "Step 2"
  ],
  "key_concepts": ["concept1", "concept2"],
  "estimated_complexity": "simple" | "medium" | "complex"
}

RULES:
- Simple, beginner-friendly language
- major_steps: NO LIMIT — include ALL necessary steps
- key_concepts: Technical terms user might not know

OUTPUT ONLY JSON.`;
}
