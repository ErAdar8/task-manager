import { projectSchema, type CreateProjectInput, type Project } from "@/schemas/projects";
import { db } from "@/lib/storage/db";

function rowToProject(row: Record<string, unknown>): Project {
  return projectSchema.parse({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    repo_scan: row.repo_scan ?? "",
    total_tasks: row.total_tasks ?? 0,
    completed_tasks: row.completed_tasks ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export async function readProjects(): Promise<Project[]> {
  const { data, error } = await db()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToProject(r as Record<string, unknown>));
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await db()
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error || !data) return null;
  return rowToProject(data as Record<string, unknown>);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: input.user_id ?? "local_user",
    name: input.name,
    description: input.description ?? null,
    repo_scan: "",
    total_tasks: 0,
    completed_tasks: 0,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db().from("projects").insert(row).select().single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create project");
  return rowToProject(data as Record<string, unknown>);
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description" | "repo_scan">>
): Promise<Project | null> {
  const { data, error } = await db()
    .from("projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToProject(data as Record<string, unknown>);
}

export async function deleteProject(projectId: string): Promise<boolean> {
  // Get task IDs without parsing full task objects (avoids schema validation errors)
  const { data: taskRows } = await db()
    .from("tasks")
    .select("id")
    .eq("project_id", projectId);

  if (taskRows && taskRows.length > 0) {
    const ids = taskRows.map((r) => r.id as string);
    // Delete learnings attached to these tasks
    await db().from("learnings").delete().in("source_task_id", ids);
    // Delete tasks explicitly (cascade would also handle this)
    await db().from("tasks").delete().in("id", ids);
  }

  const { error } = await db().from("projects").delete().eq("id", projectId);
  return !error;
}

export async function syncProjectTaskCounts(projectId: string): Promise<Project | null> {
  const { data: taskRows } = await db()
    .from("tasks")
    .select("id, status")
    .eq("project_id", projectId);
  const total = taskRows?.length ?? 0;
  const completed = taskRows?.filter((r) => r.status === "completed").length ?? 0;
  const { data, error } = await db()
    .from("projects")
    .update({ total_tasks: total, completed_tasks: completed, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToProject(data as Record<string, unknown>);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function writeProjects(_projects: Project[]): Promise<void> {}
