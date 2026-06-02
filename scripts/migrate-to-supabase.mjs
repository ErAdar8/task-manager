/**
 * One-time migration: local data/  →  Supabase
 * Run with: node scripts/migrate-to-supabase.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL = "https://wkzlyzxcnoyhsjhoepla.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indremx5enhjbm95aHNqaG9lcGxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5MTM1NCwiZXhwIjoyMDk1OTY3MzU0fQ.psWrqPtwPRjHB3n5f8SBbfmABfrfet9oO-4eoQvkL4c";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const DATA_DIR = join(process.cwd(), "data");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function listJsonFiles(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

async function upsert(table, rows) {
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows, { onConflict: "id" });
  if (error) console.error(`  ✗ ${table}:`, error.message);
}

// ── projects ──────────────────────────────────────────────
async function migrateProjects() {
  const projects = readJson(join(DATA_DIR, "projects.json")) ?? [];
  const rows = projects.map((p) => ({
    id: p.id,
    user_id: p.user_id ?? "local_user",
    name: p.name,
    description: p.description ?? null,
    repo_scan: p.repo_scan ?? "",
    total_tasks: p.total_tasks ?? 0,
    completed_tasks: p.completed_tasks ?? 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
  await upsert("projects", rows);
  console.log(`  ✓ projects: ${rows.length}`);
}

// ── tasks ─────────────────────────────────────────────────
async function migrateTasks() {
  const files = listJsonFiles(join(DATA_DIR, "tasks"));
  const rows = [];
  for (const f of files) {
    const t = readJson(f);
    if (!t?.id) continue;
    rows.push({
      id: t.id,
      project_id: t.project_id,
      user_id: t.user_id ?? "local_user",
      title: t.title,
      raw_input: t.raw_input ?? "",
      status: t.status ?? "draft",
      analysis_mode: t.analysis_mode ?? null,
      last_analysis_kind: t.last_analysis_kind ?? null,
      understanding: t.understanding ?? null,
      understanding_approved: t.understanding_approved ?? false,
      requested_clarifications: t.requested_clarifications ?? [],
      user_edited_understanding: t.user_edited_understanding ?? null,
      architecture: t.architecture ?? null,
      task_notes: t.task_notes ?? "",
      cursor_repo_analysis: t.cursor_repo_analysis ?? "",
      cursor_repo_scan: t.cursor_repo_scan ?? "",
      work_process: t.work_process ?? "",
      main_problem: t.main_problem ?? "",
      key_concepts: t.key_concepts ?? [],
      issues: t.issues ?? [],
      canonical_execute_result: t.canonical_execute_result ?? null,
      canonical_understand_result: t.canonical_understand_result ?? null,
      canonical_testing_result: t.canonical_testing_result ?? null,
      canonical_qa_result: t.canonical_qa_result ?? null,
      analysis_error: t.analysis_error ?? null,
      analysis_partial: t.analysis_partial ?? false,
      card_description_images: t.card_description_images ?? [],
      task_notes_images: t.task_notes_images ?? [],
      created_at: t.created_at,
      updated_at: t.updated_at,
      completed_at: t.completed_at ?? null,
    });
  }
  // upsert in batches of 20 (rows can be large)
  for (let i = 0; i < rows.length; i += 20) {
    await upsert("tasks", rows.slice(i, i + 20));
  }
  console.log(`  ✓ tasks: ${rows.length}`);
}

// ── learnings ─────────────────────────────────────────────
async function migrateLearnings() {
  const files = listJsonFiles(join(DATA_DIR, "learnings"));
  const rows = [];
  for (const f of files) {
    const l = readJson(f);
    if (!l?.id) continue;
    rows.push({
      id: l.id,
      user_id: "local_user",
      title: l.title ?? null,
      content: l.content,
      category: l.category ?? null,
      attachments: l.attachments ?? [],
      source_type: l.source?.type ?? "general",
      source_task_id: l.source?.taskId ?? null,
      source_task_title: l.source?.taskTitle ?? null,
      source_project_id: l.source?.projectId ?? null,
      source_project_name: l.source?.projectName ?? null,
      created_at: l.createdAt,
      updated_at: l.updatedAt,
    });
  }
  for (let i = 0; i < rows.length; i += 50) {
    await upsert("learnings", rows.slice(i, i + 50));
  }
  console.log(`  ✓ learnings: ${rows.length}`);
}

// ── notes ─────────────────────────────────────────────────
async function migrateNotes() {
  const files = listJsonFiles(join(DATA_DIR, "notes"));
  const rows = [];
  for (const f of files) {
    const n = readJson(f);
    if (!n?.id) continue;
    rows.push({
      id: n.id,
      user_id: n.user_id ?? "local_user",
      title: n.title,
      content: n.content,
      tags: n.tags ?? [],
      created_at: n.created_at,
      updated_at: n.updated_at,
    });
  }
  await upsert("notes", rows);
  console.log(`  ✓ notes: ${rows.length}`);
}

// ── run ───────────────────────────────────────────────────
console.log("Migrating local data → Supabase...");
await migrateProjects();
await migrateTasks();
await migrateLearnings();
await migrateNotes();
console.log("Done.");
