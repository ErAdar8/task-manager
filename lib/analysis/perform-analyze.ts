import { getProject } from "@/lib/storage/projects";
import { readTask } from "@/lib/storage/tasks";
import { getAnalyzeExecuteSystemPrompt } from "@/lib/prompts/analyze-execute";
import { getAnalyzeUnderstandSystemPrompt } from "@/lib/prompts/analyze-understand";
import {
  appendTaskImagesToMessage,
  callClaudeMessages,
  extractAndRepairJson,
  extractTextFromClaudeResponse,
  type ClaudeContentBlock,
} from "@/lib/task-analyze-claude";
import { buildExecuteUserMessage, buildUnderstandUserMessage } from "@/lib/analysis/task-messages";
import { resolveModel } from "@/lib/analysis/resolve-model";

export async function performAnalyzeExecute(taskId: string): Promise<Record<string, unknown>> {
  const task = await readTask(taskId);
  if (!task) throw new Error("Task not found");
  const project = await getProject(task.project_id);
  const repoScan = (project?.repo_scan?.trim() || task.cursor_repo_scan?.trim()) || "";
  const userMessage = buildExecuteUserMessage(task, repoScan);
  const system = getAnalyzeExecuteSystemPrompt();
  const messageContent: ClaudeContentBlock[] = [{ type: "text", text: userMessage }];
  await appendTaskImagesToMessage(messageContent, task.card_description_images ?? []);
  const model = resolveModel("execute");
  const data = await callClaudeMessages({
    model,
    system,
    max_tokens: 8000,
    temperature: 0.3,
    messageContent,
  });
  const text = extractTextFromClaudeResponse(data);
  return extractAndRepairJson(text) as Record<string, unknown>;
}

export async function performAnalyzeUnderstand(
  taskId: string,
  options?: { userQuestions?: string }
): Promise<Record<string, unknown>> {
  const task = await readTask(taskId);
  if (!task) throw new Error("Task not found");
  const project = await getProject(task.project_id);
  const repoScan = (project?.repo_scan?.trim() || task.cursor_repo_scan?.trim()) || "";
  const userMessage = buildUnderstandUserMessage(task, repoScan, options?.userQuestions);
  const system = getAnalyzeUnderstandSystemPrompt();
  const messageContent: ClaudeContentBlock[] = [{ type: "text", text: userMessage }];
  await appendTaskImagesToMessage(messageContent, task.card_description_images ?? []);
  const model = resolveModel("understand");
  const data = await callClaudeMessages({
    model,
    system,
    max_tokens: 8000,
    temperature: 0.4,
    messageContent,
  });
  const text = extractTextFromClaudeResponse(data);
  return extractAndRepairJson(text) as Record<string, unknown>;
}
