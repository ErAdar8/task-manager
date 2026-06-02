import { getProject } from "@/lib/storage/projects";
import { readTask } from "@/lib/storage/tasks";
import { getAnalyzeExecuteSystemPrompt } from "@/lib/prompts/analyze-execute";
import { getAnalyzeUnderstandSystemPrompt } from "@/lib/prompts/analyze-understand";
import { getAnalyzeTestingUnderstandSystemPrompt } from "@/lib/prompts/analyze-testing-understand";
import { getAnalyzeQaSystemPrompt, type QaPromptKind } from "@/lib/prompts/analyze-qa";
import {
  appendTaskImagesToMessage,
  callClaudeMessages,
  extractAndRepairJsonFromTextBlocks,
  extractTextBlocksFromClaudeResponse,
  type ClaudeContentBlock,
} from "@/lib/task-analyze-claude";
import {
  buildExecuteUserMessage,
  buildQaUserMessage,
  buildTestingUnderstandUserMessage,
  buildUnderstandUserMessage,
} from "@/lib/analysis/task-messages";
import { resolveModel } from "@/lib/analysis/resolve-model";

export async function performAnalyzeExecute(taskId: string): Promise<{
  raw: Record<string, unknown>;
  partial: boolean;
  reason?: "response_truncated";
}> {
  const task = await readTask(taskId);
  if (!task) throw new Error("Task not found");
  const project = await getProject(task.project_id);
  const projectRepoScan = project?.repo_scan?.trim() ?? "";
  const userMessage = buildExecuteUserMessage(task, projectRepoScan);
  const system = getAnalyzeExecuteSystemPrompt();
  const messageContent: ClaudeContentBlock[] = [{ type: "text", text: userMessage }];
  await appendTaskImagesToMessage(messageContent, task.card_description_images ?? []);
  const model = resolveModel("execute");
  const data = await callClaudeMessages({
    model,
    system,
    max_tokens: 16000,
    temperature: 0.3,
    messageContent,
  });
  const blocks = extractTextBlocksFromClaudeResponse(data);
  const extracted = extractAndRepairJsonFromTextBlocks(blocks);
  if (extracted.value == null || typeof extracted.value !== "object") {
    const reason = extracted.reason ?? "parse_failed";
    const msg =
      reason === "response_truncated"
        ? "Claude response was truncated (hit token limit)."
        : reason === "no_json_found"
          ? "No JSON object found in Claude response."
          : "Could not parse JSON from Claude response.";
    throw new Error(msg);
  }
  return {
    raw: extracted.value as Record<string, unknown>,
    partial: extracted.partial,
    ...(extracted.reason === "response_truncated" ? { reason: "response_truncated" as const } : {}),
  };
}

export async function performAnalyzeUnderstand(
  taskId: string,
  options?: { userQuestions?: string }
): Promise<{
  raw: Record<string, unknown>;
  partial: boolean;
  reason?: "response_truncated";
}> {
  const task = await readTask(taskId);
  if (!task) throw new Error("Task not found");
  const project = await getProject(task.project_id);
  const projectRepoScan = project?.repo_scan?.trim() ?? "";
  const userMessage = buildUnderstandUserMessage(task, projectRepoScan, options?.userQuestions);
  const system = getAnalyzeUnderstandSystemPrompt();
  const messageContent: ClaudeContentBlock[] = [{ type: "text", text: userMessage }];
  await appendTaskImagesToMessage(messageContent, task.card_description_images ?? []);
  const model = resolveModel("understand");
  const data = await callClaudeMessages({
    model,
    system,
    max_tokens: 16000,
    temperature: 0.4,
    messageContent,
  });
  const blocks = extractTextBlocksFromClaudeResponse(data);
  const extracted = extractAndRepairJsonFromTextBlocks(blocks);
  if (extracted.value == null || typeof extracted.value !== "object") {
    const reason = extracted.reason ?? "parse_failed";
    const msg =
      reason === "response_truncated"
        ? "Claude response was truncated (hit token limit)."
        : reason === "no_json_found"
          ? "No JSON object found in Claude response."
          : "Could not parse JSON from Claude response.";
    throw new Error(msg);
  }
  return {
    raw: extracted.value as Record<string, unknown>,
    partial: extracted.partial,
    ...(extracted.reason === "response_truncated" ? { reason: "response_truncated" as const } : {}),
  };
}

export async function performAnalyzeTestingUnderstand(
  taskId: string,
  options?: { userFocus?: string }
): Promise<{
  raw: Record<string, unknown>;
  partial: boolean;
  reason?: "response_truncated";
}> {
  const task = await readTask(taskId);
  if (!task) throw new Error("Task not found");
  const project = await getProject(task.project_id);
  const projectRepoScan = project?.repo_scan?.trim() ?? "";
  const userMessage = buildTestingUnderstandUserMessage(task, projectRepoScan, options?.userFocus);
  const system = getAnalyzeTestingUnderstandSystemPrompt();
  const messageContent: ClaudeContentBlock[] = [{ type: "text", text: userMessage }];
  await appendTaskImagesToMessage(messageContent, task.card_description_images ?? []);
  const model = resolveModel("testing_understand");
  const data = await callClaudeMessages({
    model,
    system,
    max_tokens: 16000,
    temperature: 0.35,
    messageContent,
  });
  const blocks = extractTextBlocksFromClaudeResponse(data);
  const extracted = extractAndRepairJsonFromTextBlocks(blocks);
  if (extracted.value == null || typeof extracted.value !== "object") {
    const reason = extracted.reason ?? "parse_failed";
    const msg =
      reason === "response_truncated"
        ? "Claude response was truncated (hit token limit)."
        : reason === "no_json_found"
          ? "No JSON object found in Claude response."
          : "Could not parse JSON from Claude response.";
    throw new Error(msg);
  }
  return {
    raw: extracted.value as Record<string, unknown>,
    partial: extracted.partial,
    ...(extracted.reason === "response_truncated" ? { reason: "response_truncated" as const } : {}),
  };
}

export async function performAnalyzeQa(
  taskId: string,
  kind: QaPromptKind,
  options?: { userFocus?: string }
): Promise<{
  raw: Record<string, unknown>;
  partial: boolean;
  reason?: "response_truncated";
}> {
  const task = await readTask(taskId);
  if (!task) throw new Error("Task not found");
  const project = await getProject(task.project_id);
  const projectRepoScan = project?.repo_scan?.trim() ?? "";
  const userMessage = buildQaUserMessage(kind, task, projectRepoScan, options?.userFocus);
  const system = getAnalyzeQaSystemPrompt(kind);
  const messageContent: ClaudeContentBlock[] = [{ type: "text", text: userMessage }];
  await appendTaskImagesToMessage(messageContent, task.card_description_images ?? []);
  const model = resolveModel(kind);
  const data = await callClaudeMessages({
    model,
    system,
    max_tokens: 16000,
    temperature: 0.35,
    messageContent,
  });
  const blocks = extractTextBlocksFromClaudeResponse(data);
  const extracted = extractAndRepairJsonFromTextBlocks(blocks);
  if (extracted.value == null || typeof extracted.value !== "object") {
    const reason = extracted.reason ?? "parse_failed";
    const msg =
      reason === "response_truncated"
        ? "Claude response was truncated (hit token limit)."
        : reason === "no_json_found"
          ? "No JSON object found in Claude response."
          : "Could not parse JSON from Claude response.";
    throw new Error(msg);
  }
  return {
    raw: extracted.value as Record<string, unknown>,
    partial: extracted.partial,
    ...(extracted.reason === "response_truncated" ? { reason: "response_truncated" as const } : {}),
  };
}
