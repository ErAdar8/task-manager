import { promises as fs } from "fs";
import path from "path";
import {
  projectsFileSchema,
  projectSchema,
  type Project,
  type CreateProjectInput,
} from "@/schemas/projects";
import { deleteTask, listTasksByProject } from "@/lib/storage/tasks";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_PATH = path.join(DATA_DIR, "projects.json");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export async function readProjects(): Promise<Project[]> {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(PROJECTS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = projectsFileSchema.safeParse(parsed);
    if (!result.success) return [];
    return result.data;
  } catch {
    return [];
  }
}

export async function writeProjects(projects: Project[]): Promise<void> {
  await ensureDataDir();
  const validated = projectsFileSchema.parse(projects);
  await fs.writeFile(
    PROJECTS_PATH,
    JSON.stringify(validated, null, 2),
    "utf-8"
  );
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const projects = await readProjects();
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const project: Project = {
    id,
    user_id: input.user_id,
    name: input.name,
    description: input.description,
    repo_scan: "",
    total_tasks: 0,
    completed_tasks: 0,
    created_at: now,
    updated_at: now,
  };
  projectSchema.parse(project);
  projects.push(project);
  await writeProjects(projects);
  return project;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description" | "repo_scan">>
): Promise<Project | null> {
  const projects = await readProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return null;
  const prev = projects[idx] as Project;
  const next: Project = {
    ...prev,
    ...updates,
    id: prev.id,
    user_id: prev.user_id,
    created_at: prev.created_at,
    updated_at: new Date().toISOString(),
  };
  projectSchema.parse(next);
  projects[idx] = next;
  await writeProjects(projects);
  return next;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const projects = await readProjects();
  return projects.find((p) => p.id === projectId) ?? null;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const projects = await readProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return false;
  const tasks = await listTasksByProject(projectId);
  for (const task of tasks) {
    await deleteTask(task.id);
  }
  projects.splice(idx, 1);
  await writeProjects(projects);
  return true;
}

export async function syncProjectTaskCounts(projectId: string): Promise<Project | null> {
  const projects = await readProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return null;
  const tasks = await listTasksByProject(projectId);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const next: Project = {
    ...projects[idx],
    total_tasks: tasks.length,
    completed_tasks: completedTasks,
    updated_at: new Date().toISOString(),
  };
  projectSchema.parse(next);
  projects[idx] = next;
  await writeProjects(projects);
  return next;
}
