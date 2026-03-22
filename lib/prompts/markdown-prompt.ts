import fs from "fs";
import path from "path";

export function extractSystemPromptFromMarkdown(md: string): string {
  const m = md.match(/## System prompt for the API call\s*[\r\n]+```\s*([\s\S]*?)```/);
  if (m?.[1]) return m[1].trim();
  throw new Error("Could not extract system prompt from markdown (missing ## System prompt section)");
}

export function extractUserMessageTemplateFromMarkdown(md: string): string {
  const m = md.match(/## User message template\s*[\r\n]+```\s*([\s\S]*?)```/);
  if (m?.[1]) return m[1].trim();
  throw new Error("Could not extract user message template from markdown");
}

export function readMarkdownFile(absPath: string): string {
  return fs.readFileSync(absPath, "utf-8");
}

export function markdownPathFromRoot(filename: string): string {
  return path.join(process.cwd(), filename);
}
