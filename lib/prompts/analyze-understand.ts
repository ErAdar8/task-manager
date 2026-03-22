import fs from "fs";
import path from "path";
import {
  extractSystemPromptFromMarkdown,
  extractUserMessageTemplateFromMarkdown,
  readMarkdownFile,
  markdownPathFromRoot,
} from "@/lib/prompts/markdown-prompt";

const PROMPT_PATH = markdownPathFromRoot("understanding-learning.md");

let _cachedSystem: string | null = null;
let _cachedUserTpl: string | null = null;
let _mtime = 0;

function refreshCache(): void {
  const stat = fs.statSync(PROMPT_PATH);
  if (_cachedSystem && stat.mtimeMs === _mtime) return;
  const md = readMarkdownFile(PROMPT_PATH);
  _cachedSystem = extractSystemPromptFromMarkdown(md);
  _cachedUserTpl = extractUserMessageTemplateFromMarkdown(md);
  _mtime = stat.mtimeMs;
}

export function getAnalyzeUnderstandSystemPrompt(): string {
  refreshCache();
  if (!_cachedSystem) throw new Error("understanding-learning.md system prompt is empty");
  return _cachedSystem;
}

export function getAnalyzeUnderstandUserMessageTemplate(): string {
  refreshCache();
  if (!_cachedUserTpl) throw new Error("understanding-learning.md user template is empty");
  return _cachedUserTpl;
}

export function getAnalyzeUnderstandMarkdownPath(): string {
  return path.join(process.cwd(), "understanding-learning.md");
}
