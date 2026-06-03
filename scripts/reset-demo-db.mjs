/**
 * reset-demo-db.mjs
 * Wipes and re-seeds the demo Supabase project from scratch.
 *
 * Usage:
 *   node scripts/reset-demo-db.mjs
 *
 * Reads credentials from .env.demo (never touches .env).
 */

import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Load .env.demo ────────────────────────────────────────
function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    const env = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnvFile(join(root, ".env.demo"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || url.includes("YOUR_") || !key || key.includes("YOUR_")) {
  console.error("❌  Fill in .env.demo with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realtime: { transport: ws },
});

// ── Execute raw SQL via Supabase REST (pg function workaround) ──
async function sql(query) {
  const { error } = await db.rpc("exec_sql", { query }).single();
  if (error && !error.message.includes("Could not find")) {
    // If exec_sql doesn't exist, fall through to individual table ops
    throw error;
  }
}

// ── Read SQL files ────────────────────────────────────────
const schemaSql = readFileSync(join(__dirname, "demo-schema.sql"), "utf8");
const seedSql   = readFileSync(join(__dirname, "demo-seed.sql"),   "utf8");

// ── Apply via pg REST endpoint ────────────────────────────
async function runSql(label, sqlText) {
  console.log(`\n⏳  ${label}…`);
  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sqlText }),
  });
  if (!response.ok) {
    const body = await response.text();
    // exec_sql RPC not found — use Supabase Management API instead
    if (response.status === 404 || body.includes("Could not find")) {
      return "use-management-api";
    }
    throw new Error(`SQL failed (${response.status}): ${body}`);
  }
  console.log(`✅  ${label} done`);
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log("🚀  Task Helper — demo DB reset");
  console.log(`    Project: ${url}`);

  // Try exec_sql RPC first
  const schemaResult = await runSql("Apply schema", schemaSql);

  if (schemaResult === "use-management-api") {
    // exec_sql not available — use Supabase Management API directly
    console.log("\n⚠️   exec_sql RPC not found. Trying Management API…");
    const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) throw new Error("Cannot parse project ref from URL");

    const mgmtKey = env.SUPABASE_SERVICE_ROLE_KEY; // same key works for management in some setups

    for (const [label, sqlText] of [["schema", schemaSql], ["seed", seedSql]]) {
      console.log(`\n⏳  Applying ${label} via Management API…`);
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${mgmtKey}`,
          },
          body: JSON.stringify({ query: sqlText }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        console.error(`❌  ${label} failed:`, body);
        console.log("\n📋  Manual steps:");
        console.log("    1. Go to your Supabase dashboard → SQL editor");
        console.log("    2. Run scripts/demo-schema.sql");
        console.log("    3. Run scripts/demo-seed.sql");
        return;
      }
      console.log(`✅  ${label} done`);
    }
  } else {
    await runSql("Seed demo data", seedSql);
  }

  console.log("\n🎉  Demo DB ready!");
  console.log("    Projects: 3");
  console.log("    Tasks:    14 (across draft / ready / in_progress / completed)");
  console.log("    Learnings: 9");
  console.log("    Notes:     3");
}

main().catch((e) => {
  console.error("\n❌  Reset failed:", e.message);
  process.exit(1);
});
