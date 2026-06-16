"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BookOpen } from "lucide-react";
import type { Course } from "@/schemas/courses";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/courses")
      .then((r) => r.json())
      .then((json: { success: boolean; data?: Course[] }) => {
        if (json.success && json.data) setCourses(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Courses</h1>
          <Link href="/courses/new">
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : courses.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-8 text-center text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p>No courses yet. Create one to start organizing your learning.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="border-slate-800 bg-slate-900/50 hover:border-violet-500/50 transition-colors cursor-pointer h-full">
                  <CardContent className="p-5 space-y-2">
                    <h2 className="text-lg font-semibold text-slate-100">{course.name}</h2>
                    {course.description && (
                      <p className="text-sm text-slate-400 line-clamp-2">{course.description}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      {course.total_subtopics} subtopic{course.total_subtopics !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
