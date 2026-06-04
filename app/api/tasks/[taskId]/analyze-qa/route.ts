import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { performAnalyzeQa } from "@/lib/analysis/perform-analyze";
import { mapQaJsonToUnderstanding } from "@/lib/map-analysis-to-task";
import { readTask, updateTask } from "@/lib/storage/tasks";
import type { QaPromptKind } from "@/lib/prompts/analyze-qa";

type RouteParams = { params: Promise<{ taskId: string }> };

export const maxDuration = 300;

function isQaMode(m: unknown): m is QaPromptKind {
  return m === "qa_general";
}

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
    mode?: unknown;
    userFocus?: unknown;
  };
  if (!isQaMode(body.mode)) {
    return NextResponse.json(err('mode must be "qa_general" for this route'), {
      status: 400,
    });
  }

  let userFocus: string | undefined;
  if (typeof body.userFocus === "string" && body.userFocus.trim()) {
    userFocus = body.userFocus.trim();
  }

  const allowed = ["draft", "analyzing", "understanding", "architecture_ready", "ready"];
  if (!allowed.includes(task.status)) {
    return NextResponse.json(err("Task is not in a state that allows analysis"), { status: 400 });
  }

  await updateTask(taskId, { status: "analyzing", analysis_error: null });

  try {
    const result = await performAnalyzeQa(taskId, body.mode, { userFocus });
    const { understanding, key_concepts } = mapQaJsonToUnderstanding(result.raw);

    const updated = await updateTask(taskId, {
      status: "ready",
      understanding,
      key_concepts,
      canonical_qa_result: result.raw,
      last_analysis_kind: body.mode,
      understanding_approved: true,
      user_edited_understanding: null,
      analysis_error: null,
      analysis_partial: result.partial ? true : undefined,
    });

    return NextResponse.json(ok(updated));
  } catch (error) {
    console.error("analyze-qa error:", error);
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
