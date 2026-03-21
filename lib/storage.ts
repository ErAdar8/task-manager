import fs from 'fs/promises';
import path from 'path';
import { Project, Task, Note } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

// Projects
export async function getProjects(): Promise<Project[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'projects.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find(p => p.id === id) || null;
}

export async function createProject(name: string, description?: string): Promise<Project> {
  await ensureDataDir();
  const projects = await getProjects();
  
  const project: Project = {
    id: `proj_${Date.now()}`,
    name,
    description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  projects.push(project);
  await fs.writeFile(path.join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2));
  
  // Create project-specific directory
  await fs.mkdir(path.join(DATA_DIR, project.id), { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, project.id, 'tasks.json'), JSON.stringify([]));
  await fs.writeFile(path.join(DATA_DIR, project.id, 'notes.json'), JSON.stringify([]));
  
  return project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = { ...projects[index], ...data, updated_at: new Date().toISOString() };
  await fs.writeFile(path.join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2));
  
  return projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await getProjects();
  const filtered = projects.filter(p => p.id !== id);
  
  if (filtered.length === projects.length) return false;
  
  await fs.writeFile(path.join(DATA_DIR, 'projects.json'), JSON.stringify(filtered, null, 2));
  
  try {
    await fs.rm(path.join(DATA_DIR, id), { recursive: true });
  } catch {
    // Directory might not exist
  }
  
  return true;
}

// Tasks
export async function getTasks(projectId: string): Promise<Task[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(path.join(DATA_DIR, projectId, 'tasks.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getTask(projectId: string, taskId: string): Promise<Task | null> {
  const tasks = await getTasks(projectId);
  return tasks.find(t => t.id === taskId) || null;
}

export async function createTask(
  projectId: string,
  title: string,
  cardDescription: string,
  cursorRepoScan?: string
): Promise<Task> {
  await ensureDataDir();
  const tasks = await getTasks(projectId);
  
  const task: Task = {
    id: `task_${Date.now()}`,
    project_id: projectId,
    title,
    card_description: cardDescription,
    cursor_repo_scan: cursorRepoScan,
    status: 'draft',
    learnings: [],
    work_process: '',
    issues: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  tasks.push(task);
  await fs.writeFile(path.join(DATA_DIR, projectId, 'tasks.json'), JSON.stringify(tasks, null, 2));
  
  return task;
}

export async function updateTask(projectId: string, taskId: string, data: Partial<Task>): Promise<Task | null> {
  const tasks = await getTasks(projectId);
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) return null;
  
  tasks[index] = { ...tasks[index], ...data, updated_at: new Date().toISOString() };
  await fs.writeFile(path.join(DATA_DIR, projectId, 'tasks.json'), JSON.stringify(tasks, null, 2));
  
  return tasks[index];
}

export async function deleteTask(projectId: string, taskId: string): Promise<boolean> {
  const tasks = await getTasks(projectId);
  const filtered = tasks.filter(t => t.id !== taskId);
  
  if (filtered.length === tasks.length) return false;
  
  await fs.writeFile(path.join(DATA_DIR, projectId, 'tasks.json'), JSON.stringify(filtered, null, 2));
  return true;
}

// Notes
export async function getNotes(projectId: string): Promise<Note[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(path.join(DATA_DIR, projectId, 'notes.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getAllNotes(): Promise<Note[]> {
  const projects = await getProjects();
  const allNotes: Note[] = [];
  
  for (const project of projects) {
    const notes = await getNotes(project.id);
    allNotes.push(...notes);
  }
  
  return allNotes;
}

export async function createNote(projectId: string, title: string, content: string): Promise<Note> {
  await ensureDataDir();
  const notes = await getNotes(projectId);
  
  const note: Note = {
    id: `note_${Date.now()}`,
    project_id: projectId,
    title,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  notes.push(note);
  await fs.writeFile(path.join(DATA_DIR, projectId, 'notes.json'), JSON.stringify(notes, null, 2));
  
  return note;
}

export async function updateNote(projectId: string, noteId: string, data: Partial<Note>): Promise<Note | null> {
  const notes = await getNotes(projectId);
  const index = notes.findIndex(n => n.id === noteId);
  
  if (index === -1) return null;
  
  notes[index] = { ...notes[index], ...data, updated_at: new Date().toISOString() };
  await fs.writeFile(path.join(DATA_DIR, projectId, 'notes.json'), JSON.stringify(notes, null, 2));
  
  return notes[index];
}

export async function deleteNote(projectId: string, noteId: string): Promise<boolean> {
  const notes = await getNotes(projectId);
  const filtered = notes.filter(n => n.id !== noteId);
  
  if (filtered.length === notes.length) return false;
  
  await fs.writeFile(path.join(DATA_DIR, projectId, 'notes.json'), JSON.stringify(filtered, null, 2));
  return true;
}
