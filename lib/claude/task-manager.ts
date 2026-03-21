import { completeClaude } from "@/lib/claude/client";
import { buildPhase1Prompt } from "@/lib/prompts/phase1-understanding";
import { buildPhase2Prompt } from "@/lib/prompts/phase2-architecture";
import { buildRegeneratePrompt } from "@/lib/prompts/regenerate-understanding";
import {
  taskArchitectureSchema,
  taskUnderstandingSchema,
  type TaskUnderstanding,
} from "@/schemas/tasks";

function parseJsonFromClaude(raw: string): unknown {
  const trimmed = raw.trim();
  const jsonStr = trimmed.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(jsonStr);
}

export async function generateTaskUnderstanding(
  taskId: string,
  rawInput: string,
  cursorRepoScan?: string
) {
  const result = await completeClaude({
    sessionId: taskId,
    systemPrompt: "You produce JSON outputs only.",
    userMessage: buildPhase1Prompt(rawInput, cursorRepoScan),
  });
  return taskUnderstandingSchema.parse(parseJsonFromClaude(result.fullText));
}

export async function regenerateTaskUnderstanding(
  taskId: string,
  rawInput: string,
  currentUnderstanding: TaskUnderstanding,
  notes: string
) {
  const result = await completeClaude({
    sessionId: taskId,
    systemPrompt: "You produce JSON outputs only.",
    userMessage: buildRegeneratePrompt(rawInput, currentUnderstanding, notes),
  });
  return taskUnderstandingSchema.parse(parseJsonFromClaude(result.fullText));
}

export async function generateTaskArchitecture(
  taskId: string,
  rawInput: string,
  understanding: TaskUnderstanding,
  clarifications: string[],
  cursorRepoAnalysis?: string
) {
  const prompt = buildPhase2Prompt(
    rawInput,
    understanding,
    clarifications,
    cursorRepoAnalysis
  );
  const simplifiedPrompt = `${prompt}

STRICT RETRY MODE:
- Return valid JSON only.
- Keep the same schema.
- No markdown fences.
- No prose outside the JSON object.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fallbackMissingKey = {
      clarifications: clarifications.map((concept) => ({
        concept,
        explanation:
          "[ERROR: ANTHROPIC_API_KEY missing. Cannot generate explanation.]",
        context_in_task: "N/A",
      })),
      detailed_breakdown:
        "# Architecture Generation Failed\n\nReason: ANTHROPIC_API_KEY is missing.",
      file_modifications: [],
      testing_steps: [],
      edge_cases: [],
      estimated_time: "Unknown",
    };
    return taskArchitectureSchema.parse(fallbackMissingKey);
  }

  const callClaude = async (userPrompt: string): Promise<string> => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    console.log("Claude API status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API failed: ${response.status} - ${errorText}`);
    }
    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    return data.content?.find((block) => block.type === "text")?.text ?? "";
  };

  const cleanJsonText = (input: string): string => {
    let output = input
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();
    const firstBrace = output.indexOf("{");
    const lastBrace = output.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      output = output.substring(firstBrace, lastBrace + 1);
    }
    return output;
  };

  const parseArchitecture = async (rawText: string): Promise<ReturnType<typeof taskArchitectureSchema.parse>> => {
    const cleaned = cleanJsonText(rawText);
    console.log("Raw Claude response length:", rawText.length);
    console.log("First 500 chars:", rawText.substring(0, 500));
    console.log("Cleaned text length:", cleaned.length);
    console.log("First 200 chars of cleaned:", cleaned.substring(0, 200));

    try {
      const parsed = JSON.parse(cleaned);
      return taskArchitectureSchema.parse(parsed);
    } catch (parseError) {
      console.error("JSON parse failed:", parseError);
      console.error("Problematic JSON (first 1000 chars):", cleaned.substring(0, 1000));
      const fixPrompt = `The following JSON is malformed. Fix it and return ONLY valid JSON:

${cleaned}

Return ONLY the fixed JSON, no explanation.`;
      const fixedText = await callClaude(fixPrompt);
      const fixedCleaned = cleanJsonText(fixedText);
      const fixedParsed = JSON.parse(fixedCleaned);
      return taskArchitectureSchema.parse(fixedParsed);
    }
  };

  const isInvalidArchitecture = (
    architecture: ReturnType<typeof taskArchitectureSchema.parse>
  ): boolean => {
    const breakdown = architecture.detailed_breakdown?.trim() ?? "";
    if (breakdown.length < 160) return true;
    if (/architecture generation failed/i.test(breakdown)) return true;
    return false;
  };

  try {
    console.log("Phase 2 task id:", taskId);
    console.log("Calling Claude API for Phase 2...");
    const attempt1Text = await callClaude(prompt);
    let architecture = await parseArchitecture(attempt1Text);

    if (isInvalidArchitecture(architecture)) {
      console.error("Attempt 1 architecture failed validation, retrying...");
      const attempt2Text = await callClaude(simplifiedPrompt);
      architecture = await parseArchitecture(attempt2Text);
      if (isInvalidArchitecture(architecture)) {
        throw new Error(
          "Phase 2 output invalid after retry: detailed_breakdown is empty/incomplete."
        );
      }
    }

    return architecture;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Phase 2 generation error:", error);
    const fallback = {
      clarifications: clarifications.map((concept) => ({
        concept,
        explanation: `[ERROR: Generation failed for "${concept}". ${message}]`,
        context_in_task: "N/A",
      })),
      detailed_breakdown: `# Architecture Generation Failed

## What went wrong
- ${message}

## Next action
- Retry architecture generation.
- If it fails again, copy task understanding and generate architecture manually with Claude.`,
      file_modifications: [],
      testing_steps: ["Retry architecture generation once issue is resolved."],
      edge_cases: ["Model output could not be parsed into valid JSON."],
      estimated_time: "Unknown",
    };
    return taskArchitectureSchema.parse(fallback);
  }
}
