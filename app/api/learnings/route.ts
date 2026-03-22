import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import {
  addLearningToTask,
  createLearning,
  listAllLearnings,
} from "@/lib/storage/learnings";
import { createStandaloneLearningInputSchema } from "@/schemas/learnings";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const taskId = searchParams.get("taskId");
  const projectId = searchParams.get("projectId");
  let list = await listAllLearnings();
  if (source === "task") list = list.filter((l) => l.source.type === "task");
  if (source === "general") list = list.filter((l) => l.source.type === "general");
  if (taskId) list = list.filter((l) => l.source.taskId === taskId);
  if (projectId) list = list.filter((l) => l.source.projectId === projectId);
  return NextResponse.json(ok(list));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) {
    return NextResponse.json(err("content is required"), { status: 400 });
  }

  const src = body.source as { type?: string; taskId?: string } | undefined;
  if (src?.type === "task" && typeof src.taskId === "string" && src.taskId) {
    const attachments =
      Array.isArray(body.attachments) && body.attachments.every((s) => typeof s === "string")
        ? (body.attachments as string[])
        : [];
    const result = await addLearningToTask(src.taskId, {
      content: content.trim(),
      category: typeof body.category === "string" ? body.category : undefined,
      attachments,
      title: typeof body.title === "string" ? body.title : undefined,
    });
    if (!result) {
      return NextResponse.json(err("Task not found"), { status: 404 });
    }
    return NextResponse.json(ok(result.learning));
  }

  const parsed = createStandaloneLearningInputSchema.safeParse({
    content: content.trim(),
    title: typeof body.title === "string" ? body.title : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    attachments:
      Array.isArray(body.attachments) && body.attachments.every((s) => typeof s === "string")
        ? (body.attachments as string[])
        : [],
    source: body.source ?? { type: "general" },
  });
  if (!parsed.success) {
    return NextResponse.json(err("Invalid body"), { status: 400 });
  }
  const created = await createLearning(parsed.data);
  return NextResponse.json(ok(created));
}
