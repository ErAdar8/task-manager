import type { Task } from "@/schemas/tasks";
import { getAnalyzeExecuteUserMessageTemplate } from "@/lib/prompts/analyze-execute";
import { getAnalyzeUnderstandUserMessageTemplate } from "@/lib/prompts/analyze-understand";
import { getAnalyzeTestingUnderstandUserMessageTemplate } from "@/lib/prompts/analyze-testing-understand";
import {
  getAnalyzeQaUserMessageTemplate,
  type QaPromptKind,
} from "@/lib/prompts/analyze-qa";

const REPO_SCAN_NONE =
  "(none — add a project Repo scan or task-level scan)";

function formatRepoScanForUserMessage(
  projectRepoScan: string,
  task: Task
): string {
  const proj = projectRepoScan.trim();
  const taskScan = task.cursor_repo_scan?.trim() ?? "";
  if (proj && taskScan) {
    return (
      "Grounding: The sections below are factual context about the repository and this specific task. " +
      "Ground your answer in them together with the task card.\n\n" +
      "## Project-level repo context\n\n" +
      proj +
      "\n\n## Task-level Cursor analysis (repo scan)\n\n" +
      taskScan
    );
  }
  if (proj) return proj;
  if (taskScan) return taskScan;
  return REPO_SCAN_NONE;
}

export function buildExecuteUserMessage(
  task: Task,
  projectRepoScan: string
): string {
  const tpl = getAnalyzeExecuteUserMessageTemplate();
  const taskCard = `Title: ${task.title}\n\n${task.raw_input}`;
  const relevant = task.cursor_repo_analysis?.trim() || "(none provided)";
  const repo = formatRepoScanForUserMessage(projectRepoScan, task);
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
  const repo = formatRepoScanForUserMessage(projectRepoScan, task);
  const notes = task.task_notes?.trim() || "(none)";
  const questions = userQuestions?.trim() || "(none specified)";
  return tpl
    .replaceAll("{taskCard}", taskCard)
    .replaceAll("{relevantFilesContent}", relevant)
    .replaceAll("{repoScan}", repo)
    .replaceAll("{userNotes}", notes)
    .replaceAll("{userQuestions}", questions);
}

export function buildTestingUnderstandUserMessage(
  task: Task,
  projectRepoScan: string,
  userFocus?: string
): string {
  const tpl = getAnalyzeTestingUnderstandUserMessageTemplate();
  const taskCard = `Title: ${task.title}\n\n${task.raw_input}`;
  const relevant = task.cursor_repo_analysis?.trim() || "(none provided)";
  const repo = formatRepoScanForUserMessage(projectRepoScan, task);
  const notes = task.task_notes?.trim() || "(none)";
  const focus = userFocus?.trim() || "(none specified)";
  return tpl
    .replaceAll("{taskCard}", taskCard)
    .replaceAll("{relevantFilesContent}", relevant)
    .replaceAll("{repoScan}", repo)
    .replaceAll("{userNotes}", notes)
    .replaceAll("{userQuestions}", focus);
}

export function buildQaUserMessage(
  kind: QaPromptKind,
  task: Task,
  projectRepoScan: string,
  userFocus?: string
): string {
  const tpl = getAnalyzeQaUserMessageTemplate(kind);
  const taskCard = `Title: ${task.title}\n\n${task.raw_input}`;
  const relevant = task.cursor_repo_analysis?.trim() || "(none provided)";
  const repo = formatRepoScanForUserMessage(projectRepoScan, task);
  const notes = task.task_notes?.trim() || "(none)";
  const focus = userFocus?.trim() || "(none specified)";
  return tpl
    .replaceAll("{taskCard}", taskCard)
    .replaceAll("{relevantFilesContent}", relevant)
    .replaceAll("{repoScan}", repo)
    .replaceAll("{userNotes}", notes)
    .replaceAll("{userQuestions}", focus);
}
