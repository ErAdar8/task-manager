import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { performAnalyzeUnderstand } from "@/lib/analysis/perform-analyze";
import {
  mapUnderstandJsonToKeyConcepts,
  mapUnderstandJsonToUnderstanding,
} from "@/lib/map-analysis-to-task";
import { readTask, updateTask } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ taskId: string }> };

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { taskId } = await params;
    const task = await readTask(taskId);
    if (!task) {
      return NextResponse.json(err("Task not found"), { status: 404 });
    }
    if (!task.understanding) {
      return NextResponse.json(err("Task understanding missing"), { status: 400 });
    }

    const body = (await request.json()) as {
      edited_text?: unknown;
      request_regeneration?: unknown;
      regeneration_notes?: unknown;
    };

    if (body.request_regeneration === true) {
      if (typeof body.regeneration_notes !== "string" || !body.regeneration_notes.trim()) {
        return NextResponse.json(err("regeneration_notes required"), { status: 400 });
      }
      const raw = await performAnalyzeUnderstand(task.id, {
        userQuestions: body.regeneration_notes.trim(),
      });
      const understanding = mapUnderstandJsonToUnderstanding(raw);
      const key_concepts = mapUnderstandJsonToKeyConcepts(raw);
      const updated = await updateTask(task.id, {
        understanding,
        key_concepts,
        canonical_understand_result: raw,
        last_analysis_kind: "understand",
        user_edited_understanding: null,
        understanding_approved: true,
        architecture: null,
        status: "ready",
        analysis_error: null,
      });
      return NextResponse.json(ok(updated?.understanding ?? understanding));
    }

    if (typeof body.edited_text !== "string" || !body.edited_text.trim()) {
      return NextResponse.json(err("edited_text required"), { status: 400 });
    }
    const updated = await updateTask(task.id, {
      user_edited_understanding: body.edited_text,
      understanding_approved: false,
      architecture: null,
      status: "understanding",
    });
    return NextResponse.json(ok(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(err(message), { status: 500 });
  }
}
