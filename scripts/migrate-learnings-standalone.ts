/**
 * One-time migration: copy task.learnings[] entries into data/learnings/*.json.
 * Idempotent: skips if a standalone file with the same id already exists.
 */
import { promises as fs } from "fs";
import path from "path";
import type { StandaloneLearning } from "@/schemas/learnings";
import { getProject } from "@/lib/storage/projects";
import { addLearningToListIndex } from "@/lib/storage/index-utils";
import { readLearning, writeLearning } from "@/lib/storage/learnings";
import { readTask } from "@/lib/storage/tasks";

const TASKS_DIR = path.join(process.cwd(), "data", "tasks");

async function main(): Promise<void> {
  let files: string[];
  try {
    files = await fs.readdir(TASKS_DIR);
  } catch {
    console.log("No tasks directory; nothing to migrate.");
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const taskId = file.replace(/\.json$/, "");
    const task = await readTask(taskId);
    if (!task) continue;
    const project = await getProject(task.project_id);
    for (const learning of task.learnings) {
      const existing = await readLearning(learning.id);
      if (existing) {
        skipped += 1;
        continue;
      }
      const standalone: StandaloneLearning = {
        id: learning.id,
        content: learning.content,
        title: learning.title,
        category: learning.category,
        attachments: learning.attachments ?? [],
        source: {
          type: "task",
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.project_id,
          projectName: project?.name ?? "",
        },
        createdAt: learning.created_at,
        updatedAt: learning.created_at,
      };
      await writeLearning(standalone);
      await addLearningToListIndex(standalone.id);
      migrated += 1;
    }
  }

  console.log(`Migration done. Created ${migrated} standalone file(s), skipped ${skipped} (already existed).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
