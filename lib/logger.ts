import { promises as fs } from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "data", "logs", "app.log");

export type LogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error";
  route?: string;
  session_id?: string;
  artifact_hash?: string;
  duration_ms?: number;
  status?: string;
  prompt_token_count?: number;
  response_token_count?: number;
  latency_ms?: number;
  verification_status?: "passed" | "hallucination_detected" | "schema_error";
  symbols_found?: number;
  critical_count?: number;
  message?: string;
  [key: string]: unknown;
};

async function ensureLogDir(): Promise<void> {
  const dir = path.dirname(LOG_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore if exists
  }
}

export async function log(entry: LogEntry): Promise<void> {
  const line = JSON.stringify({
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  }) + "\n";
  try {
    await ensureLogDir();
    await fs.appendFile(LOG_FILE, line);
  } catch (err) {
    console.error("[logger] Failed to write log:", err);
  }
}

export function logSync(entry: LogEntry): void {
  const line = JSON.stringify({
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  }) + "\n";
  ensureLogDir()
    .then(() => fs.appendFile(LOG_FILE, line))
    .catch((err) => {
      console.error("[logger] Failed to write log:", err);
    });
}
