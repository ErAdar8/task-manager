import { projectSchema, type CreateProjectInput, type Project } from "@/schemas/projects";
import { db } from "@/lib/storage/db";
import { deleteTask, listTasksByProject } from "@/lib/storage/tasks";

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
  const tasks = await listTasksByProject(projectId);
  for (const task of tasks) await deleteTask(task.id);
  const { error } = await db().from("projects").delete().eq("id", projectId);
  return !error;
}

export async function syncProjectTaskCounts(projectId: string): Promise<Project | null> {
  const tasks = await listTasksByProject(projectId);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  return updateProject(projectId, {}) // trigger updated_at
    .then(async (p) => {
      if (!p) return null;
      const { data, error } = await db()
        .from("projects")
        .update({ total_tasks: tasks.length, completed_tasks: completedTasks, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select()
        .single();
      if (error || !data) return null;
      return rowToProject(data as Record<string, unknown>);
    });
}

// kept for compat — no-op in Supabase world
export async function writeProjects(_projects: Project[]): Promise<void> {}
