import type { Task } from "@/schemas/tasks";
import { getAnalyzeExecuteUserMessageTemplate } from "@/lib/prompts/analyze-execute";
import { getAnalyzeUnderstandUserMessageTemplate } from "@/lib/prompts/analyze-understand";

export function buildExecuteUserMessage(
  task: Task,
  projectRepoScan: string
): string {
  const tpl = getAnalyzeExecuteUserMessageTemplate();
  const taskCard = `Title: ${task.title}\n\n${task.raw_input}`;
  const relevant = task.cursor_repo_analysis?.trim() || "(none provided)";
  const repo =
    projectRepoScan.trim() ||
    task.cursor_repo_scan?.trim() ||
    "(none — add a project Repo scan or task-level scan)";
  const notes = task.task_notes?.trim() || "(none)";
  return tpl
    .replaceAll("{taskCard}", taskCard)
    .replaceAll("{relevantFilesContent}", relevant)
    .replaceAll("{repoScan}", repo)
    .replaceAll("{userNotes}", notes)
    .replaceAll("{userConstraints}", "(none)");
}

export function buildUnderstandUserMessage(
  task: Task,
  projectRepoScan: string,
  userQuestions?: string
): string {
  const tpl = getAnalyzeUnderstandUserMessageTemplate();
  const taskCard = `Title: ${task.title}\n\n${task.raw_input}`;
  const relevant = task.cursor_repo_analysis?.trim() || "(none provided)";
  const repo =
    projectRepoScan.trim() ||
    task.cursor_repo_scan?.trim() ||
    "(none — add a project Repo scan or task-level scan)";
  const notes = task.task_notes?.trim() || "(none)";
  const questions = userQuestions?.trim() || "(none specified)";
  return tpl
    .replaceAll("{taskCard}", taskCard)
    .replaceAll("{relevantFilesContent}", relevant)
    .replaceAll("{repoScan}", repo)
    .replaceAll("{userNotes}", notes)
    .replaceAll("{userQuestions}", questions);
}
