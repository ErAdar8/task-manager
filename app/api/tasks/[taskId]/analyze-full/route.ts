import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { getProject } from "@/lib/storage/projects";
import { readTask, updateTask } from "@/lib/storage/tasks";
import {
  taskUnderstandingSchema,
  conceptExplanationSchema,
  type TaskUnderstanding,
  type ConceptExplanation,
} from "@/schemas/tasks";

/** Single analysis call response: understanding (with stages + estimated_time) + key_concepts + optional out-of-scope suggestions. */
interface AnalyzeResponse {
  understanding: {
    high_level_goal: string;
    why_this_matters: string;
    major_steps?: string[];
    estimated_time?: string;
    stages?: Array<{
      title: string;
      goal: string;
      tasks: string[];
      completion_criteria: string[];
    }>;
  };
  key_concepts?: Array<{
    concept: string;
    explanation: string;
    context_in_task: string;
  }>;
  /** Optional: improvements or ideas that are NOT required to complete the task card. */
  suggestions_out_of_scope?: string[];
}

/** Parse data URL to { media_type, data } for Claude API */
function parseDataUrl(dataUrl: string): { media_type: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  const [, mediaType, base64] = match;
  if (!mediaType || !base64) return null;
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const normalized = mediaType.toLowerCase().split("+")[0];
  if (!allowed.includes(normalized)) return null;
  return { media_type: normalized, data: base64 };
}

type ContentBlock = { type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function extractAndRepairJson(raw: string): string {
  let str = raw.trim();
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) str = codeBlock[1].trim();
  const objectMatch = str.match(/\{[\s\S]*\}/);
  if (objectMatch) str = objectMatch[0];
  str = str.replace(/,(\s*[}\]])/g, "$1");
  str = str.replace(/"((?:[^"\\]|\\.)*)"/g, (m) => m.replace(/\r?\n/g, "\\n"));
  return str;
}

function parseJson<T>(responseText: string, label: string): T {
  const candidate = extractAndRepairJson(responseText);
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  const jsonStr = objectMatch ? objectMatch[0] : candidate;
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error(`${label} JSON parse failed. First 500 chars:`, responseText.slice(0, 500));
    throw new Error(`Failed to parse analysis response as JSON. The model may have returned invalid or truncated output.`);
  }
}

const API_TIMEOUT_MS = 300_000; // 5 minutes

async function callClaudeApi(
  model: string,
  systemPrompt: string,
  messageContent: ContentBlock[]
): Promise<string> {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  clearTimeout(timeoutId);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as { content: Array<{ text: string }> };
  return data.content[0]?.text ?? "";
}

type RouteParams = { params: Promise<{ taskId: string }> };

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;

  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }

  const allowedStatuses = ["draft", "analyzing", "understanding", "architecture_ready"];
  if (!allowedStatuses.includes(task.status)) {
    return NextResponse.json(
      err("Task is not in a state that allows analysis"),
      { status: 400 }
    );
  }

  await updateTask(taskId, { status: "analyzing", analysis_error: null });

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const systemPrompt = `You are a senior software architect helping plan a development task. Output ONLY valid JSON — no markdown, no code fences, no prose. Use escaped newline (\\\\n) inside string values, never literal newlines.

You MUST keep the understanding and stages STRICTLY within the scope of the task card description and any explicit notes from the user. Do NOT add extra architecture work, refactors, or improvements that were not requested. If you have ideas that go beyond the task card, put them ONLY in "suggestions_out_of_scope".

Output this exact structure:
{
  "understanding": {
    "high_level_goal": "one sentence describing what the task accomplishes (based ONLY on the task card)",
    "why_this_matters": "brief business or technical reason (derived from the task card)",
    "estimated_time": "e.g. 2-4 hours or 1 day",
    "stages": [
      {
        "title": "short stage name",
        "goal": "what this stage achieves (in scope for the task card)",
        "tasks": ["concrete task 1", "concrete task 2"],
        "completion_criteria": ["criterion 1", "criterion 2"]
      }
    ]
  },
  "key_concepts": [
    { "concept": "term", "explanation": "brief explanation", "context_in_task": "how it applies" }
  ],
  "suggestions_out_of_scope": [
    "Optional improvement or idea that is NOT required to complete the task card",
    "Another out-of-scope suggestion"
  ]
}

Scope rules:
- All stages, goals, tasks, and completion_criteria MUST describe only the work required to complete the task card (and any explicit user notes).
- Do NOT include refactors, extra fields, or broader architecture changes inside the stages if they are not clearly requested.
- Any idea that goes beyond the task card goes ONLY into suggestions_out_of_scope.
- It is OK for suggestions_out_of_scope to be an empty array when there are no extra ideas.

Formatting rules:
- Use 2–5 stages.
- Group tasks by topic / logical phase.
- Do not over-plan.
- No code.
- Keep it readable for a junior-to-mid developer.`;

  try {
    const project = await getProject(task.project_id);
    const repoContext =
      (project?.repo_scan?.trim() || task.cursor_repo_scan?.trim()) || "";

    const userPrompt = `Analyze this development task.

Task Title: ${task.title}

Task Description:
${task.raw_input}

${repoContext ? `Repository Context (Cursor scan):\n${repoContext}` : ""}

Very important: the understanding and stages must describe only the work required to complete this task card. If you have additional ideas that are outside the card's scope, put them ONLY into suggestions_out_of_scope.

Provide understanding (goal, why it matters, estimated time, stages with tasks and completion criteria), key concepts, and suggestions_out_of_scope. Output only the JSON object.`;

    const messageContent: ContentBlock[] = [{ type: "text", text: userPrompt }];
    const imageUrls = task.card_description_images ?? [];
    for (const dataUrl of imageUrls) {
      const parsed = parseDataUrl(dataUrl);
      if (parsed) messageContent.push({ type: "image", source: { type: "base64", media_type: parsed.media_type, data: parsed.data } });
    }

    const responseText = await callClaudeApi(model, systemPrompt, messageContent);
    const result = parseJson<AnalyzeResponse>(responseText, "analysis");

    const u = result.understanding;
    const stages = Array.isArray(u.stages) ? u.stages : [];
    const major_steps =
      Array.isArray(u.major_steps) && u.major_steps.length > 0
        ? u.major_steps
        : stages.flatMap((s) => s.tasks);

    const understanding: TaskUnderstanding = taskUnderstandingSchema.parse({
      high_level_goal: u.high_level_goal ?? "",
      why_this_matters: u.why_this_matters ?? "",
      major_steps,
      key_concepts: [],
      estimated_time: typeof u.estimated_time === "string" ? u.estimated_time : "",
      stages: stages.map((s) => ({
        title: s.title ?? "",
        goal: s.goal ?? "",
        tasks: Array.isArray(s.tasks) ? s.tasks : [],
        completion_criteria: Array.isArray(s.completion_criteria) ? s.completion_criteria : [],
      })),
    });

    const key_concepts: ConceptExplanation[] = (result.key_concepts ?? []).map((kc) =>
      conceptExplanationSchema.parse(kc)
    );

    const updated = await updateTask(taskId, {
      status: "ready",
      understanding,
      key_concepts,
      understanding_approved: true,
      analysis_error: null,
    });

    return NextResponse.json(ok(updated));
  } catch (error) {
    console.error("analyze-full error:", error);
    const isAbort = error instanceof Error && error.name === "AbortError";
    const message = isAbort
      ? "Analysis timed out after 5 minutes. Try again or use a shorter task description."
      : error instanceof Error
        ? error.message
        : "Analysis failed";
    await updateTask(taskId, {
      status: "draft",
      analysis_error: message,
    }).catch(() => {});
    return NextResponse.json(err(message), { status: 500 });
  }
}
