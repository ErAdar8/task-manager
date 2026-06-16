"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { useAppMode } from "@/lib/hooks/use-app-mode";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Project } from "@/schemas/projects";
import type { Task } from "@/schemas/tasks";
import type { Course } from "@/schemas/courses";
import type { Topic } from "@/schemas/topics";
import type { Subtopic } from "@/schemas/subtopics";

function taskStatusIcon(status: Task["status"]): string {
  if (status === "draft") return "\u{1F4DD}";
  if (status === "understanding") return "\u{1F50D}";
  if (status === "architecture_ready") return "\u{1F3D7}️";
  if (status === "in_progress") return "\u{1F504}";
  return "✅";
}

export function Sidebar({
  selectedTaskId,
  selectedProjectId,
  onClose,
}: {
  selectedTaskId: string | null;
  selectedProjectId: string | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { mode, setMode } = useAppMode();

  // Analysis mode state
  const [activeProjectId, setActiveProjectId] = useState<string | null>(selectedProjectId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Learning mode state
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const json = (await res.json()) as { success: boolean; data?: Project[] };
    if (json.success && json.data) setProjects(json.data);
  }, []);

  const loadTasks = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`);
    const json = (await res.json()) as { success: boolean; data?: Task[] };
    if (json.success && json.data) setTasks(json.data);
  }, []);

  const loadCourses = useCallback(async () => {
    const res = await fetch("/api/courses");
    const json = (await res.json()) as { success: boolean; data?: Course[] };
    if (json.success && json.data) setCourses(json.data);
  }, []);

  const loadTopics = useCallback(async (courseId: string) => {
    const res = await fetch(`/api/topics?courseId=${encodeURIComponent(courseId)}`);
    const json = (await res.json()) as { success: boolean; data?: Topic[] };
    if (json.success && json.data) setTopics(json.data);
  }, []);

  const loadSubtopics = useCallback(async (topicId: string) => {
    const res = await fetch(`/api/subtopics?topicId=${encodeURIComponent(topicId)}`);
    const json = (await res.json()) as { success: boolean; data?: Subtopic[] };
    if (json.success && json.data) setSubtopics(json.data);
  }, []);

  useEffect(() => { setActiveProjectId(selectedProjectId); }, [selectedProjectId]);

  useEffect(() => {
    if (mode === "analysis") void loadProjects();
    else void loadCourses();
  }, [mode, loadProjects, loadCourses]);

  useEffect(() => {
    const onProjects = () => { void loadProjects(); };
    const onCourses = () => { void loadCourses(); };
    window.addEventListener("projects-updated", onProjects);
    window.addEventListener("courses-updated", onCourses);
    return () => {
      window.removeEventListener("projects-updated", onProjects);
      window.removeEventListener("courses-updated", onCourses);
    };
  }, [loadProjects, loadCourses]);

  useEffect(() => {
    if (!activeProjectId) { setTasks([]); return; }
    void loadTasks(activeProjectId);
  }, [activeProjectId, loadTasks]);

  useEffect(() => {
    if (!activeCourseId) { setTopics([]); setSubtopics([]); return; }
    void loadTopics(activeCourseId);
  }, [activeCourseId, loadTopics]);

  useEffect(() => {
    if (!activeTopicId) { setSubtopics([]); return; }
    void loadSubtopics(activeTopicId);
  }, [activeTopicId, loadSubtopics]);

  useEffect(() => {
    if (!activeProjectId) return;
    if (!projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(selectedProjectId);
      setTasks([]);
    }
  }, [projects, activeProjectId, selectedProjectId]);

  return (
    <div className="flex flex-col h-full min-w-0 border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex h-12 items-center justify-between border-b border-slate-800 px-3 shrink-0">
        <span className="text-sm font-semibold">Task Manager</span>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        )}
      </div>

      <div className="px-3 pt-3 pb-2">
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "analysis" ? (
        <>
          <div className="p-3 border-b border-slate-800">
            <div className="flex flex-col gap-1">
              <Link href="/projects" className="text-sm text-slate-300 hover:text-white">Projects</Link>
              <Link href="/notes" className="text-sm text-slate-300 hover:text-white">Notes</Link>
              <Link href="/learnings" className="text-sm text-slate-300 hover:text-white">Learnings</Link>
            </div>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="space-y-1">
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-2 py-1 rounded text-sm",
                      activeProjectId === project.id ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60"
                    )}
                    onClick={() => {
                      setActiveProjectId(project.id);
                      router.push(`/projects/${project.id}`);
                      onClose?.();
                    }}
                  >
                    {project.name}
                  </button>
                  {activeProjectId === project.id && (
                    <div className="pl-3 space-y-1">
                      <Link href={`/projects/${project.id}/learnings`} className="block text-xs text-blue-300 hover:text-blue-200">
                        View Learnings
                      </Link>
                      {tasks.map((task) => (
                        <Link key={task.id}
                          href={`/projects/${project.id}/tasks/${task.id}`}
                          className={cn(
                            "block text-xs truncate px-1 py-0.5 rounded",
                            selectedTaskId === task.id ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {taskStatusIcon(task.status)} {task.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-slate-800">
            <Link href="/projects/new">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="p-3 border-b border-slate-800">
            <div className="flex flex-col gap-1">
              <Link href="/courses" className="text-sm text-slate-300 hover:text-white">Courses</Link>
              <Link href="/learning/note" className="text-sm text-slate-300 hover:text-white">Notes</Link>
              <Link href="/learning/learning" className="text-sm text-slate-300 hover:text-white">Learnings</Link>
              <Link href="/learning/flow" className="text-sm text-slate-300 hover:text-white">Flows</Link>
              <Link href="/learning/image" className="text-sm text-slate-300 hover:text-white">Images</Link>
            </div>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.id} className="space-y-0.5">
                  {/* Course row */}
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-2 py-1 rounded text-sm flex items-center gap-1",
                      activeCourseId === course.id ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60"
                    )}
                    onClick={() => {
                      if (activeCourseId === course.id) {
                        setActiveCourseId(null);
                        setActiveTopicId(null);
                      } else {
                        setActiveCourseId(course.id);
                        setActiveTopicId(null);
                        router.push(`/courses/${course.id}`);
                        onClose?.();
                      }
                    }}
                  >
                    {activeCourseId === course.id
                      ? <ChevronDown className="h-3 w-3 shrink-0" />
                      : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{course.name}</span>
                  </button>

                  {/* Topics under this course */}
                  {activeCourseId === course.id && (
                    <div className="pl-3 space-y-0.5">
                      {topics.map((topic) => (
                        <div key={topic.id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full text-left px-2 py-0.5 rounded text-xs flex items-center gap-1",
                              activeTopicId === topic.id ? "text-violet-300" : "text-slate-400 hover:text-slate-200"
                            )}
                            onClick={() => {
                              if (activeTopicId === topic.id) {
                                setActiveTopicId(null);
                              } else {
                                setActiveTopicId(topic.id);
                                router.push(`/courses/${course.id}/topics/${topic.id}`);
                                onClose?.();
                              }
                            }}
                          >
                            {activeTopicId === topic.id
                              ? <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                              : <ChevronRight className="h-2.5 w-2.5 shrink-0" />}
                            <span className="truncate">{topic.title}</span>
                          </button>

                          {/* Subtopics under this topic */}
                          {activeTopicId === topic.id && (
                            <div className="pl-3 space-y-0.5 mt-0.5">
                              {subtopics.map((st) => (
                                <Link
                                  key={st.id}
                                  href={`/courses/${course.id}/topics/${topic.id}/subtopics/${st.id}`}
                                  className="block text-xs truncate px-1 py-0.5 rounded text-slate-500 hover:text-slate-300"
                                >
                                  · {st.title}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-slate-800">
            <Link href="/courses/new">
              <Button className="w-full bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
