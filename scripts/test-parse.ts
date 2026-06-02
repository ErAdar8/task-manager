import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { taskSchema } from "../schemas/tasks";

async function main() {
const sb = createClient(
  "https://wkzlyzxcnoyhsjhoepla.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indremx5enhjbm95aHNqaG9lcGxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5MTM1NCwiZXhwIjoyMDk1OTY3MzU0fQ.psWrqPtwPRjHB3n5f8SBbfmABfrfet9oO-4eoQvkL4c",
  { auth: { persistSession: false }, realtime: { transport: ws as unknown as typeof WebSocket } }
);

const { data } = await sb.from("tasks").select("*");
let ok = 0, fail = 0;
for (const row of data ?? []) {
  const r = taskSchema.safeParse({
    ...row,
    learnings: [],
    raw_input: row.raw_input ?? "",
    card_description_images: row.card_description_images ?? [],
    task_notes: row.task_notes ?? "",
    task_notes_images: row.task_notes_images ?? [],
    cursor_repo_analysis: row.cursor_repo_analysis ?? "",
    cursor_repo_scan: row.cursor_repo_scan ?? "",
    work_process: row.work_process ?? "",
    main_problem: row.main_problem ?? "",
    key_concepts: row.key_concepts ?? [],
    issues: row.issues ?? [],
    requested_clarifications: row.requested_clarifications ?? [],
    completed_at: row.completed_at ?? null,
    analysis_error: row.analysis_error ?? null,
    last_analysis_kind: row.last_analysis_kind ?? null,
    analysis_partial: row.analysis_partial ?? false,
  });
  if (!r.success) {
    fail++;
    console.log("FAIL", row.id, JSON.stringify(r.error.issues.slice(0, 5)));
  } else {
    ok++;
  }
}
console.log(`ok: ${ok}  fail: ${fail}`);
}
void main();
