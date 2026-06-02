import fs from "fs";
import path from "path";
import {
  extractSystemPromptFromMarkdown,
  extractUserMessageTemplateFromMarkdown,
  readMarkdownFile,
  markdownPathFromRoot,
} from "@/lib/prompts/markdown-prompt";

export type QaPromptKind = "qa_kalk" | "qa_general";

const PATHS: Record<QaPromptKind, string> = {
  qa_kalk: markdownPathFromRoot("qa-kalk.md"),
  qa_general: markdownPathFromRoot("qa-general.md"),
};

type CacheEntry = { system: string; userTpl: string; mtime: number };
const cache: Partial<Record<QaPromptKind, CacheEntry>> = {};

function refreshCache(kind: QaPromptKind): void {
  const p = PATHS[kind];
  const stat = fs.statSync(p);
  const c = cache[kind];
  if (c && stat.mtimeMs === c.mtime) return;
  const md = readMarkdownFile(p);
  cache[kind] = {
    system: extractSystemPromptFromMarkdown(md),
    userTpl: extractUserMessageTemplateFromMarkdown(md),
    mtime: stat.mtimeMs,
  };
}

export function getAnalyzeQaSystemPrompt(kind: QaPromptKind): string {
  refreshCache(kind);
  const s = cache[kind]?.system;
  if (!s) throw new Error(`${PATHS[kind]} system prompt is empty`);
  return s;
}

export function getAnalyzeQaUserMessageTemplate(kind: QaPromptKind): string {
  refreshCache(kind);
  const t = cache[kind]?.userTpl;
  if (!t) throw new Error(`${PATHS[kind]} user template is empty`);
  return t;
}

export function getAnalyzeQaMarkdownPath(kind: QaPromptKind): string {
  return PATHS[kind];
}
