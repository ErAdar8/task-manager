import { NextResponse } from "next/server";
import { db } from "@/lib/storage/db";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_SUPABASE_URL not set" }, { status: 500 });
  if (!svcKey && !anonKey) return NextResponse.json({ ok: false, error: "No Supabase key set" }, { status: 500 });

  try {
    const { data: projects, error: pe } = await db().from("projects").select("id, name").limit(10);
    if (pe) return NextResponse.json({ ok: false, error: "projects query failed: " + pe.message }, { status: 500 });

    const { data: tasks, error: te } = await db().from("tasks").select("id, project_id, title").limit(5);
    if (te) return NextResponse.json({ ok: false, error: "tasks query failed: " + te.message }, { status: 500 });

    // Test loading tasks for each project to catch parse errors
    const { taskSchema } = await import("@/schemas/tasks");
    const { data: allTasks } = await db().from("tasks").select("*");
    let parseOk = 0, parseFail = 0;
    const failures: { id: string; issue: string }[] = [];
    for (const row of allTasks ?? []) {
      const r = taskSchema.safeParse({
        ...row,
        learnings: [],
        raw_input: row.raw_input ?? "",
        card_description_images: row.card_description_images ?? [],
        task_notes: row.task_notes ?? "",
        task_notes_images: row.task_notes_images ?? [],
        cursor_repo_analysis: row.cursor_repo_analysis ?? "",
        cursor_repo_scan: row.cursor_repo_scan ?? "",
        work_process: row.work_process ?? "",
        main_problem: row.main_problem ?? "",
        key_concepts: row.key_concepts ?? [],
        issues: row.issues ?? [],
        requested_clarifications: row.requested_clarifications ?? [],
        completed_at: row.completed_at ?? null,
        analysis_error: row.analysis_error ?? null,
        last_analysis_kind: row.last_analysis_kind ?? null,
        analysis_partial: row.analysis_partial ?? false,
        analysis_mode: row.analysis_mode ?? undefined,
      });
      if (r.success) parseOk++;
      else { parseFail++; failures.push({ id: row.id as string, issue: r.error.issues[0]?.message ?? "unknown" }); }
    }

    return NextResponse.json({
      ok: true,
      env: { url: url.slice(0, 30) + "…", hasServiceKey: !!svcKey, hasAnonKey: !!anonKey },
      projects: projects?.map(p => ({ id: p.id, name: p.name })),
      taskSample: tasks?.map(t => ({ id: t.id, project_id: t.project_id, title: t.title })),
      parseStats: { ok: parseOk, fail: parseFail },
      parseFailures: failures.slice(0, 10),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
