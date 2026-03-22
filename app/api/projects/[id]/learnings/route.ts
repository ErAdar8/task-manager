import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api-types";
import { listLearningsByProject } from "@/lib/storage/learnings";
import { readTask } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const list = await listLearningsByProject(id);
  const byTask = new Map<
    string,
    {
      task_id: string;
      task_title: string;
      completed_at: string | null;
      learnings: Array<{
        id: string;
        content: string;
        category?: string;
        title?: string;
      }>;
    }
  >();

  for (const l of list) {
    if (l.source.type !== "task" || !l.source.taskId) continue;
    const tid = l.source.taskId;
    if (!byTask.has(tid)) {
      const t = await readTask(tid);
      byTask.set(tid, {
        task_id: tid,
        task_title: t?.title ?? l.source.taskTitle ?? "",
        completed_at: t?.completed_at ?? null,
        learnings: [],
      });
    }
    byTask.get(tid)!.learnings.push({
      id: l.id,
      content: l.content,
      category: l.category,
      title: l.title,
    });
  }

  const grouped = [...byTask.values()].filter((g) => g.learnings.length > 0);
  return NextResponse.json(ok(grouped));
}
