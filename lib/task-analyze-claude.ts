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

  const timeoutMs = 300_000; // 5 minutes
  const maxAttempts = 3;

  function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  function errorCode(e: unknown): string | undefined {
    if (!e || typeof e !== "object") return undefined;
    const any = e as { code?: unknown; cause?: unknown };
    if (typeof any.code === "string") return any.code;
    const c = any.cause as { code?: unknown } | undefined;
    if (c && typeof c === "object" && typeof c.code === "string") return c.code;
    return undefined;
  }

  function isRetryableNetworkError(e: unknown): boolean {
    const code = errorCode(e);
    return (
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "EAI_AGAIN" ||
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND"
    );
  }

  let response: Response | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
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
        signal: controller.signal,
      });
      break;
    } catch (e) {
      lastError = e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("Claude request timed out after 300s");
      }
      const retryable = isRetryableNetworkError(e);
      if (!retryable || attempt === maxAttempts) throw e;
      // Exponential-ish backoff: 0.75s, 1.5s
      await sleep(750 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!response) throw lastError ?? new Error("Claude request failed");

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 404) {
      let detail = error;
      let errType: string | undefined;
      try {
        const j = JSON.parse(error) as {
          error?: { type?: string; message?: string };
        };
        errType = j.error?.type;
        if (j.error?.message) detail = j.error.message;
      } catch {
        /* keep raw body */
      }
      const isModelNotFound =
        errType === "not_found_error" ||
        /not_found|model/i.test(detail) ||
        /not_found_error/i.test(error);
      if (isModelNotFound) {
        throw new Error(
          `Model '${model}' not found. Check that the model string is correct and available on your API key. (${detail})`
        );
      }
    }
    // Retryable upstream / transient responses.
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`Claude API error ${response.status}: ${error}`);
    }
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

export type JsonExtractionResult = {
  value: unknown;
  partial: boolean;
  reason?: "response_truncated" | "no_json_found" | "parse_failed";
};

export function extractTextBlocksFromClaudeResponse(data: {
  content: Array<{ type?: string; text?: string }>;
}): string[] {
  return (data.content ?? [])
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => (b.text as string) ?? "")
    .filter((t) => t.trim().length > 0);
}

function stripMarkdownFences(s: string): string {
  const trimmed = s.trim();
  // Grab the first fenced block if present, otherwise return original.
  const match = trimmed.match(/```[\t ]*(?:json|JSON)?[\t ]*\r?\n([\s\S]*?)```/);
  if (match?.[1]) return match[1].trim();
  // Also handle single-line fences: ```json {...} ```
  const matchInline = trimmed.match(/```[\t ]*(?:json|JSON)?[\t ]*([\s\S]*?)```/);
  if (matchInline?.[1]) return matchInline[1].trim();
  return trimmed;
}

function extractOuterJsonObject(s: string): string | null {
  const trimmed = s.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return trimmed.slice(first, last + 1);
}

function analyzeJsonBalance(s: string): {
  openCurly: number;
  closeCurly: number;
  openSquare: number;
  closeSquare: number;
  unterminatedString: boolean;
} {
  let openCurly = 0;
  let closeCurly = 0;
  let openSquare = 0;
  let closeSquare = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
        continue;
      }
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") openCurly++;
    else if (ch === "}") closeCurly++;
    else if (ch === "[") openSquare++;
    else if (ch === "]") closeSquare++;
  }

  return {
    openCurly,
    closeCurly,
    openSquare,
    closeSquare,
    unterminatedString: inString,
  };
}

function repairTruncatedJson(s: string): { repaired: string; didRepair: boolean } {
  const trimmed = s.trimEnd();
  const bal = analyzeJsonBalance(trimmed);
  const missingCurly = Math.max(0, bal.openCurly - bal.closeCurly);
  const missingSquare = Math.max(0, bal.openSquare - bal.closeSquare);
  const needsQuote = bal.unterminatedString;
  const didRepair = missingCurly > 0 || missingSquare > 0 || needsQuote;

  if (!didRepair) return { repaired: trimmed, didRepair: false };

  let out = trimmed;
  if (needsQuote) out += "\"";
  // Close arrays before objects (more common nesting), then objects.
  out += "]".repeat(missingSquare);
  out += "}".repeat(missingCurly);
  return { repaired: out, didRepair: true };
}

function tryParseJsonCandidate(candidate: string): { ok: true; value: unknown } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

export function extractAndRepairJsonFromTextBlocks(textBlocks: string[]): JsonExtractionResult {
  const failures: string[] = [];
  for (const original of textBlocks) {
    const stage0 = original.trim();
    if (!stage0) continue;

    // 1) Raw parse
    const direct = tryParseJsonCandidate(stage0);
    if (direct.ok) return { value: direct.value, partial: false };
    failures.push("direct_parse_failed");

    // 2) Strip fences
    const unfenced = stripMarkdownFences(stage0);
    if (unfenced !== stage0) {
      const unfencedParsed = tryParseJsonCandidate(unfenced);
      if (unfencedParsed.ok) return { value: unfencedParsed.value, partial: false };
      failures.push("fence_stripped_parse_failed");
    }

    // 3) Trim pre/post and parse outer object
    const outer = extractOuterJsonObject(unfenced);
    if (outer) {
      const outerParsed = tryParseJsonCandidate(outer);
      if (outerParsed.ok) return { value: outerParsed.value, partial: false };
      failures.push("outer_object_parse_failed");

      // 4) Repair truncation when we have at least one closing brace.
      const repaired = repairTruncatedJson(outer);
      if (repaired.didRepair) {
        const repairedParsed = tryParseJsonCandidate(repaired.repaired);
        if (repairedParsed.ok) {
          return {
            value: repairedParsed.value,
            partial: true,
            reason: "response_truncated",
          };
        }
        failures.push("repaired_parse_failed");
      }
    } else {
      failures.push("no_outer_object_found");

      // Extra fallback: response was truncated before any closing brace.
      // If we can find an opening brace, try to repair from there.
      const firstBrace = unfenced.indexOf("{");
      if (firstBrace !== -1) {
        const tail = unfenced.slice(firstBrace);
        const repairedTail = repairTruncatedJson(tail);
        if (repairedTail.didRepair) {
          const repairedParsed = tryParseJsonCandidate(repairedTail.repaired);
          if (repairedParsed.ok) {
            return {
              value: repairedParsed.value,
              partial: true,
              reason: "response_truncated",
            };
          }
          failures.push("tail_repaired_parse_failed");
        }
      }
    }
  }

  // If we got here, nothing parsed. Decide the most descriptive reason.
  const reason: JsonExtractionResult["reason"] =
    failures.includes("no_outer_object_found") && failures.length === 1
      ? "no_json_found"
      : failures.includes("no_outer_object_found")
        ? "no_json_found"
        : "parse_failed";

  const preview = textBlocks.find((t) => t.trim())?.trim().slice(0, 500) ?? "";
  console.error("Claude response parse failed. Preview:", preview);

  return {
    value: null,
    partial: false,
    reason,
  };
}

export function extractAndRepairJson(text: string): unknown {
  const result = extractAndRepairJsonFromTextBlocks([text]);
  if (result.value != null && typeof result.value === "object") return result.value;
  if (result.reason === "response_truncated") {
    throw new Error("Claude response was truncated (hit token limit) and could not be repaired");
  }
  if (result.reason === "no_json_found") {
    throw new Error("No JSON object found in Claude response");
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
