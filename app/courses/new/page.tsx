"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { Course } from "@/schemas/courses";

export default function NewCoursePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = (await res.json()) as { success: boolean; data?: Course; error?: string };
      if (json.success && json.data) {
        window.dispatchEvent(new Event("courses-updated"));
        router.push(`/courses/${json.data.id}`);
      } else {
        setError(json.error ?? "Failed to create course");
      }
    } catch {
      setError("Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-8 bg-slate-950 text-slate-100 max-w-lg mx-auto w-full">
      <Link
        href="/courses"
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </Link>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">New Course</h1>
      <p className="text-slate-400 text-sm mb-6">
        Create a course or topic to organize your learning.
      </p>
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <h2 className="text-lg font-medium text-slate-100">Course details</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-slate-300">
                Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Animation Course, n8n Workflows"
                className="mt-2 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-slate-300">
                Description (optional)
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this course covers"
                className="mt-2 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {saving ? "Creating..." : "Create course"}
              </Button>
              <Link href="/courses">
                <Button type="button" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
