import { dataUrlOrPathToClaudeImage } from "@/lib/storage/images";

export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export interface ClaudeCallParams {
  model: string;
  system: string;
  max_tokens: number;
  temperature: number;
  messageContent: ClaudeContentBlock[];
}

export async function callClaudeMessages(params: ClaudeCallParams): Promise<{
  content: Array<{ type?: string; text?: string }>;
}> {
  const { model, system, max_tokens, temperature, messageContent } = params;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      temperature,
      system,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<{
    content: Array<{ type?: string; text?: string }>;
  }>;
}

export function extractTextFromClaudeResponse(data: {
  content: Array<{ type?: string; text?: string }>;
}): string {
  const block = data.content.find((b) => b.type === "text");
  return block?.text ?? "";
}

export function extractAndRepairJson(text: string): unknown {
  const trimmed = text.trim();
  const tryParse = (s: string): unknown => JSON.parse(s);
  try {
    return tryParse(trimmed);
  } catch {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return tryParse(fence[1].trim());
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return tryParse(trimmed.slice(start, end + 1));
    } catch {
      /* continue */
    }
  }
  throw new Error("Could not parse JSON from Claude response");
}

export async function appendTaskImagesToMessage(
  messageContent: ClaudeContentBlock[],
  images: string[]
): Promise<void> {
  for (const img of images) {
    const block = await dataUrlOrPathToClaudeImage(img);
    if (block) messageContent.push(block);
  }
}
