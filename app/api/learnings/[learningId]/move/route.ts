import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import {
  moveLearningToGeneral,
  moveLearningToNote,
  moveLearningToTask,
  readLearning,
} from "@/lib/storage/learnings";

type RouteParams = { params: Promise<{ learningId: string }> };

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { learningId } = await params;
  const learning = await readLearning(learningId);
  if (!learning) {
    return NextResponse.json(err("Learning not found"), { status: 404 });
  }

  const body = (await request.json()) as { target?: unknown; taskId?: unknown };
  const target = body.target;

  if (target === "note") {
    const result = await moveLearningToNote(learningId);
    if (!result) {
      return NextResponse.json(err("Move failed"), { status: 500 });
    }
    return NextResponse.json(ok(result));
  }

  if (target === "general") {
    const result = await moveLearningToGeneral(learningId);
    if (!result) {
      return NextResponse.json(err("Cannot make general"), { status: 400 });
    }
    return NextResponse.json(ok(result));
  }

  if (target === "task") {
    if (typeof body.taskId !== "string" || !body.taskId.trim()) {
      return NextResponse.json(err("taskId is required"), { status: 400 });
    }
    const result = await moveLearningToTask(learningId, body.taskId.trim());
    if (!result) {
      return NextResponse.json(err("Task not found"), { status: 404 });
    }
    return NextResponse.json(ok(result));
  }

  return NextResponse.json(err("Invalid target"), { status: 400 });
}
