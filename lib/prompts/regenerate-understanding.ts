import type { TaskUnderstanding } from "@/schemas/tasks";

export function buildRegeneratePrompt(
  rawInput: string,
  currentUnderstanding: TaskUnderstanding,
  userNotes: string
): string {
  return `Regenerate task understanding based on user feedback.

ORIGINAL TASK:
${rawInput}

CURRENT UNDERSTANDING:
${JSON.stringify(currentUnderstanding, null, 2)}

USER FEEDBACK:
${userNotes}

Generate NEW understanding that incorporates the feedback.
Same JSON format as before.

OUTPUT ONLY JSON.`;
}
