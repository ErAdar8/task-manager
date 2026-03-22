"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { X, ImagePlus, ClipboardCopy } from "lucide-react";
import { generateTaskAwareRepoScanPromptFromDraft } from "@/lib/cursor-prompts";
import type { Task } from "@/schemas/tasks";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type NewTaskModalProps = {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onCreate: (task: Task) => void;
};

export function NewTaskModal({
  isOpen,
  projectId,
  onClose,
  onCreate,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [cardDescriptionImages, setCardDescriptionImages] = useState<string[]>([]);
  const [cursorRepoScan, setCursorRepoScan] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<"draft" | "create">("create");
  const [analysisMode, setAnalysisMode] = useState<"execute" | "understand">("execute");
  const [copyToast, setCopyToast] = useState(false);
  const cardImageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (mode: "draft" | "create") => {
    if (!title.trim() || !cardDescription.trim()) return;
    setSaving(true);
    setSaveMode(mode);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          raw_input: cardDescription.trim(),
          cursor_repo_scan: cursorRepoScan.trim() || undefined,
          analysis_mode: analysisMode,
          ...(cardDescriptionImages.length > 0 && { card_description_images: cardDescriptionImages }),
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { task?: Task };
        error?: string;
      };
      if (json.success && json.data?.task) {
        onCreate(json.data.task);
        setTitle("");
        setCardDescription("");
        setCardDescriptionImages([]);
        setCursorRepoScan("");
        onClose();
      } else {
        alert(json.error ?? "Failed to create task");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-task-title"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        className="bg-slate-900 border border-slate-700 text-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <CardHeader className="p-5 flex flex-row items-center justify-between border-b border-slate-700">
          <h2 id="new-task-title" className="text-lg font-medium text-slate-100">
            New Task
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim() && cardDescription.trim()) void handleSubmit("create");
            }}
            className="space-y-4"
          >
          <div>
            <Label className="text-slate-300">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Remove ToS from transaction logs"
              className="mt-1.5 bg-slate-800 border-slate-600 text-slate-100"
              required
            />
          </div>
          <div>
            <Label className="text-slate-300">Card description</Label>
            <Textarea
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
              placeholder="Paste the full task card or write the task in your own words. You can add notes or clarifications — the analysis will use this entire text as context."
              className="mt-1.5 min-h-[120px] bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Original card, card + your notes, or your own description. Analysis uses this full text.
            </p>
            <div className="mt-2">
              <input
                ref={cardImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
                  setCardDescriptionImages((prev) => [...prev, ...urls]);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => cardImageInputRef.current?.click()}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Add images
              </Button>
              {cardDescriptionImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {cardDescriptionImages.map((dataUrl, i) => (
                    <div
                      key={i}
                      className="relative rounded border border-slate-600 overflow-hidden bg-slate-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from user upload */}
                      <img
                        src={dataUrl}
                        alt=""
                        className="h-20 w-20 object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Remove image"
                        className="absolute top-0.5 right-0.5 rounded bg-black/70 p-1 text-white hover:bg-black"
                        onClick={() =>
                          setCardDescriptionImages((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Cursor repo scan (optional)</Label>
            <p className="text-xs text-slate-500 mt-1 mb-1.5">
              Analysis uses the project&apos;s Repo scan for all tasks. Paste here only to override for this task.
            </p>
            <div className="flex flex-wrap gap-2 mb-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  const prompt = generateTaskAwareRepoScanPromptFromDraft(
                    title.trim() || "New task",
                    cardDescription.trim() || "(see task card)"
                  );
                  void navigator.clipboard.writeText(prompt);
                  setCopyToast(true);
                  setTimeout(() => setCopyToast(false), 2500);
                }}
              >
                <ClipboardCopy className="w-4 h-4 mr-2" />
                Copy prompt for Cursor
              </Button>
              {copyToast && (
                <span className="text-xs text-emerald-400 self-center">Copied to clipboard</span>
              )}
            </div>
            <Textarea
              value={cursorRepoScan}
              onChange={(e) => setCursorRepoScan(e.target.value)}
              placeholder="Paste Cursor’s repo analysis here (optional; project Repo scan is used if set)."
              className="mt-1.5 min-h-[80px] bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Analysis flow</Label>
            <p className="text-xs text-slate-500">
              Choose how Claude should analyze this task after you run analysis on the task page.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAnalysisMode("execute")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  analysisMode === "execute"
                    ? "border-emerald-500/70 bg-emerald-950/30 ring-1 ring-emerald-500/40"
                    : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                }`}
              >
                <span className="text-sm font-medium text-emerald-300">Understand &amp; Execute</span>
                <p className="text-xs text-slate-400 mt-1">
                  You already understand the task — execution plan and topic cards (Opus).
                </p>
              </button>
              <button
                type="button"
                onClick={() => setAnalysisMode("understand")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  analysisMode === "understand"
                    ? "border-violet-500/70 bg-violet-950/30 ring-1 ring-violet-500/40"
                    : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                }`}
              >
                <span className="text-sm font-medium text-violet-300">Deep Understanding</span>
                <p className="text-xs text-slate-400 mt-1">
                  Learn the domain first — concepts, reading order, pitfalls (Sonnet).
                </p>
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2 justify-end border-t border-slate-700">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || !title.trim() || !cardDescription.trim()}
              className="border-slate-600 text-slate-200"
              onClick={() => void handleSubmit("draft")}
            >
              {saving && saveMode === "draft" ? "Saving…" : "Save as draft"}
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim() || !cardDescription.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && saveMode === "create" ? "Creating…" : "Create task"}
            </Button>
          </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
