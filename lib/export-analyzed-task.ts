import type { Task } from "@/schemas/tasks";

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Markdown bundle for reviewers / coding agents: task card first, then analysis payloads.
 */
export function buildAnalyzedTaskExportMarkdown(task: Task): string {
  const lines: string[] = [];
  lines.push("# Task export");
  lines.push("");
  lines.push("## 1. Task card");
  lines.push("");
  lines.push(`**Title:** ${task.title}`);
  lines.push("");
  lines.push("### Description");
  lines.push(task.raw_input || "(empty)");
  lines.push("");
  if (task.task_notes?.trim()) {
    lines.push("### Task notes");
    lines.push(task.task_notes.trim());
    lines.push("");
  }
  if (task.cursor_repo_scan?.trim()) {
    lines.push("### Task-level Cursor repo scan");
    lines.push(task.cursor_repo_scan.trim());
    lines.push("");
  }
  const imgCount = task.card_description_images?.length ?? 0;
  if (imgCount > 0) {
    lines.push(`_(Card description images: ${imgCount} attached — omitted from export.)_`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 2. Agent analysis");
  lines.push("");
  if (task.last_analysis_kind) {
    lines.push(`**Last analysis flow:** ${task.last_analysis_kind}`);
    lines.push("");
  }
  if (task.user_edited_understanding?.trim()) {
    lines.push("### User-edited understanding");
    lines.push(task.user_edited_understanding.trim());
    lines.push("");
  }
  if (task.understanding) {
    lines.push("### Structured understanding");
    lines.push("```json");
    lines.push(safeJson(task.understanding));
    lines.push("```");
    lines.push("");
  }
  if ((task.key_concepts?.length ?? 0) > 0) {
    lines.push("### Key concepts");
    lines.push("```json");
    lines.push(safeJson(task.key_concepts));
    lines.push("```");
    lines.push("");
  }
  if (task.canonical_understand_result && Object.keys(task.canonical_understand_result).length > 0) {
    lines.push("### Deep understanding (canonical JSON)");
    lines.push("```json");
    lines.push(safeJson(task.canonical_understand_result));
    lines.push("```");
    lines.push("");
  }
  if (task.canonical_execute_result && Object.keys(task.canonical_execute_result).length > 0) {
    lines.push("### Execute plan (canonical JSON)");
    lines.push("```json");
    lines.push(safeJson(task.canonical_execute_result));
    lines.push("```");
    lines.push("");
  }
  if (task.cursor_repo_analysis?.trim()) {
    lines.push("### Cursor repo analysis (files / context)");
    lines.push(task.cursor_repo_analysis.trim());
    lines.push("");
  }
  if (task.architecture) {
    lines.push("### Architecture plan");
    lines.push("```json");
    lines.push(safeJson(task.architecture));
    lines.push("```");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 3. Metadata");
  lines.push(`- Task id: \`${task.id}\``);
  lines.push(`- Status: ${task.status}`);
  lines.push(`- Updated: ${task.updated_at}`);
  lines.push("");

  return lines.join("\n");
}

export function exportFilenameForTask(task: Task): string {
  const slug =
    task.title
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "task";
  return `${slug}-export.md`;
}
