import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 bg-slate-950 text-slate-100">
      <h1 className="text-2xl font-semibold text-slate-100">Junior Developer Task Manager</h1>
      <p className="text-slate-400 text-center max-w-md">
        Paste a task card, review understanding, build architecture, and track learnings.
      </p>
      <Link href="/projects">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          View Projects
        </Button>
      </Link>
    </main>
  );
}
