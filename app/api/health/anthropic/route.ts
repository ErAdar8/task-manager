import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5-20250929";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return NextResponse.json(
      {
        status: "error",
        message: "ANTHROPIC_API_KEY not set in environment",
      },
      { status: 500 }
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "Hi" }],
    });

    return NextResponse.json({
      status: "ok",
      message: "API key is valid and working",
      model: MODEL,
      response_id: response.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "error",
        message,
        error: String(err),
      },
      { status: 500 }
    );
  }
}
