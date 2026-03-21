"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type LearningDraft = { content: string; category: string };

interface CompleteTaskModalProps {
  open: boolean;
  taskTitle: string;
  onClose: () => void;
  onComplete: (learnings: Array<{ content: string; category?: string }>) => void | Promise<void>;
}

export default function CompleteTaskModal({
  open,
  taskTitle,
  onClose,
  onComplete,
}: CompleteTaskModalProps) {
  const [saving, setSaving] = useState(false);
  const [learnings, setLearnings] = useState<LearningDraft[]>([{ content: "", category: "" }]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <h2 className="text-lg font-semibold">Complete Task: {taskTitle}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {learnings.map((learning, index) => (
            <div key={index} className="space-y-2 border border-slate-700 rounded-md p-3">
              <p className="text-sm font-medium">Learning #{index + 1}</p>
              <Textarea
                value={learning.content}
                onChange={(e) =>
                  setLearnings((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, content: e.target.value } : item
                    )
                  )
                }
                placeholder="What did you learn?"
                className="bg-slate-800 border-slate-700"
              />
              <Input
                value={learning.category}
                onChange={(e) =>
                  setLearnings((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, category: e.target.value } : item
                    )
                  )
                }
                placeholder="Category (optional)"
                className="bg-slate-800 border-slate-700"
              />
            </div>
          ))}
          <Button
            variant="outline"
            className="border-slate-600 text-slate-100"
            onClick={() => setLearnings((prev) => [...prev, { content: "", category: "" }])}
          >
            Add Another Learning
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-100" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onComplete(
                    learnings
                      .filter((learning) => learning.content.trim().length > 0)
                      .map((learning) => ({
                        content: learning.content,
                        category: learning.category.trim() || undefined,
                      }))
                  );
                  onClose();
                  setLearnings([{ content: "", category: "" }]);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Mark Complete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
