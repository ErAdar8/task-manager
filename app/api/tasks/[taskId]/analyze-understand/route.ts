import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { performAnalyzeUnderstand } from "@/lib/analysis/perform-analyze";
import {
  mapUnderstandJsonToKeyConcepts,
  mapUnderstandJsonToUnderstanding,
} from "@/lib/map-analysis-to-task";
import { readTask, updateTask } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ taskId: string }> };

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;
  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userQuestions?: unknown;
    mode?: unknown;
  };
  if (body.mode != null && body.mode !== "understand") {
    return NextResponse.json(err('mode must be "understand" for this route'), { status: 400 });
  }

  let userQuestions: string | undefined;
  if (typeof body.userQuestions === "string" && body.userQuestions.trim()) {
    userQuestions = body.userQuestions.trim();
  }

  const allowed = ["draft", "analyzing", "understanding", "architecture_ready", "ready"];
  if (!allowed.includes(task.status)) {
    return NextResponse.json(err("Task is not in a state that allows analysis"), { status: 400 });
  }

  await updateTask(taskId, { status: "analyzing", analysis_error: null });

  try {
    const result = await performAnalyzeUnderstand(taskId, { userQuestions });
    const understanding = mapUnderstandJsonToUnderstanding(result.raw);
    const key_concepts = mapUnderstandJsonToKeyConcepts(result.raw);

    const updated = await updateTask(taskId, {
      status: "ready",
      understanding,
      key_concepts,
      canonical_understand_result: result.raw,
      last_analysis_kind: "understand",
      understanding_approved: true,
      user_edited_understanding: null,
      analysis_error: null,
      analysis_partial: result.partial ? true : undefined,
    });

    return NextResponse.json(ok(updated));
  } catch (error) {
    console.error("analyze-understand error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    const reason =
      typeof message === "string" && message.toLowerCase().includes("timed out")
        ? "timeout"
        : typeof message === "string" && message.toLowerCase().includes("truncated")
          ? "response_truncated"
          : typeof message === "string" && message.toLowerCase().includes("no json")
            ? "no_json_found"
            : typeof message === "string" && message.toLowerCase().includes("parse")
              ? "parse_failed"
              : "upstream_error";
    await updateTask(taskId, {
      status: "draft",
      analysis_error: message,
    }).catch(() => {});
    return NextResponse.json(err(message, { reason }), { status: 500 });
  }
}
