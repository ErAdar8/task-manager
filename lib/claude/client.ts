import Anthropic from "@anthropic-ai/sdk";
import { log } from "@/lib/logger";

const MODEL = "claude-sonnet-4-5-20250929";

export async function streamClaude(params: {
  systemPrompt: string;
  userMessage: string;
  sessionId: string;
  onChunk: (text: string) => void;
}): Promise<{ fullText: string; usage: { input: number; output: number }; latencyMs: number }> {
  const start = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  let fullText = "";
  const stream = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.userMessage }],
    stream: true,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const text = event.delta.text;
      fullText += text;
      params.onChunk(text);
    }
  }

  const latencyMs = Date.now() - start;
  const usage = (stream as { usage?: { input_tokens: number; output_tokens: number } }).usage ?? {
    input_tokens: 0,
    output_tokens: 0,
  };

  await log({
    timestamp: new Date().toISOString(),
    level: "info",
    session_id: params.sessionId,
    prompt_token_count: usage.input_tokens,
    response_token_count: usage.output_tokens,
    latency_ms: latencyMs,
  });

  return {
    fullText,
    usage: { input: usage.input_tokens, output: usage.output_tokens },
    latencyMs,
  };
}

export async function completeClaude(params: {
  systemPrompt: string;
  userMessage: string;
  sessionId: string;
}): Promise<{ fullText: string; usage: { input: number; output: number }; latencyMs: number }> {
  const start = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const fullText = textBlock && "text" in textBlock ? textBlock.text : "";
  const usage = response.usage;
  const latencyMs = Date.now() - start;

  await log({
    timestamp: new Date().toISOString(),
    level: "info",
    session_id: params.sessionId,
    prompt_token_count: usage.input_tokens,
    response_token_count: usage.output_tokens,
    latency_ms: latencyMs,
  });

  return {
    fullText,
    usage: { input: usage.input_tokens, output: usage.output_tokens },
    latencyMs,
  };
}
