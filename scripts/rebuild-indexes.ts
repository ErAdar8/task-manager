import { rebuildLearningsIndexFromDisk } from "@/lib/storage/learnings";
import { rebuildNotesIndexFromDisk } from "@/lib/storage/notes";
import { rebuildProjectTasksIndexFromDisk } from "@/lib/storage/tasks";

async function main(): Promise<void> {
  await rebuildProjectTasksIndexFromDisk();
  await rebuildNotesIndexFromDisk();
  await rebuildLearningsIndexFromDisk();
  console.log("All indexes rebuilt under data/index/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
