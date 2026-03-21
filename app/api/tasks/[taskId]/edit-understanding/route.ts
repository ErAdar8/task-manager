import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { regenerateTaskUnderstanding } from "@/lib/claude/task-manager";
import { readTask, setTaskUnderstanding, updateTask } from "@/lib/storage/tasks";

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
      const regenerated = await regenerateTaskUnderstanding(
        task.id,
        task.raw_input,
        task.understanding,
        body.regeneration_notes
      );
      await setTaskUnderstanding(task.id, regenerated);
      const updated = await updateTask(task.id, {
        user_edited_understanding: null,
        understanding_approved: false,
        architecture: null,
        status: "understanding",
      });
      return NextResponse.json(ok(updated?.understanding ?? regenerated));
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
