// Data directory structure
// /data/projects.json - array of projects
// /data/projects/[id]/tasks.json - tasks for a project
// /data/projects/[id]/notes.json - notes for a project

export interface TaskUnderstanding {
  high_level_goal: string;
  why_this_matters: string;
  major_steps: string[];
  estimated_complexity: "low" | "medium" | "high" | "very_high";
}

export interface TaskArchitecture {
  detailed_breakdown: string;
  file_modifications: string[];
  testing_steps: string[];
  edge_cases: string[];
  estimated_time: string;
}

export interface KeyConcept {
  concept: string;
  explanation: string;
  context_in_task: string;
}

// Issue entry for documenting problems
export interface Issue {
  id: string;
  what_went_wrong: string;
  how_solved: string;
  created_at: string;
}

export type TaskStatus = "draft" | "analyzing" | "ready" | "in_progress" | "completed";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  card_description: string;
  cursor_repo_scan?: string;
  status: TaskStatus;
  understanding?: TaskUnderstanding;
  architecture?: TaskArchitecture;
  key_concepts?: KeyConcept[];
  task_notes?: string;
  learnings?: string[];
  work_process?: string;
  issues?: Issue[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  learnings?: string[];
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  project_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}
