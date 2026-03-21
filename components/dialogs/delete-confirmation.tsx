"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { X, AlertTriangle } from "lucide-react";

export type DeleteTarget = "project" | "task" | "session";

type DeleteProjectData = {
  target: "project";
  name: string;
  taskCount: number;
};

type DeleteTaskData = {
  target: "task";
  taskId: string;
  name: string;
  artifactCount?: number;
  scanCount?: number;
  learningCount?: number;
};

type DeleteSessionData = {
  target: "session";
};

export type DeleteConfirmationData = DeleteProjectData | DeleteTaskData | DeleteSessionData;

type DeleteConfirmationProps = {
  isOpen: boolean;
  data: DeleteConfirmationData | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteConfirmation({
  isOpen,
  data,
  onClose,
  onConfirm,
}: DeleteConfirmationProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!data) return;
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen || !data) return null;

  const isProject = data.target === "project";
  const isTask = data.target === "task";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <Card className="bg-slate-900 border border-slate-700 text-slate-100 shadow-xl max-w-md w-full">
        <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-slate-700">
          <h2 id="delete-dialog-title" className="text-lg font-medium flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Delete {data.target === "project" ? "Project" : data.target === "task" ? "Task" : "Session"}?
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-100"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {isProject && (
            <>
              <p className="text-slate-300 text-sm">
                Are you sure you want to delete{" "}
                <strong className="text-slate-100">{(data as DeleteProjectData).name}</strong>?
              </p>
              <p className="text-slate-400 text-sm">
                This will permanently delete:
              </p>
              <ul className="text-slate-400 text-sm list-disc list-inside space-y-1">
                <li>{(data as DeleteProjectData).taskCount} tasks</li>
                <li>All artifacts and scans</li>
                <li>Project context and notes</li>
              </ul>
              <p className="text-amber-400 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This action cannot be undone.
              </p>
            </>
          )}
          {isTask && (
            <>
              <p className="text-slate-300 text-sm">
                Are you sure you want to delete{" "}
                <strong className="text-slate-100">{(data as DeleteTaskData).name}</strong>?
              </p>
              <p className="text-slate-400 text-sm">This will delete:</p>
              <ul className="text-slate-400 text-sm list-disc list-inside space-y-1">
                <li>Task description and notes</li>
                <li>{(data as DeleteTaskData).artifactCount ?? 0} artifacts</li>
                <li>{(data as DeleteTaskData).scanCount ?? 0} boundary scans</li>
                <li>{(data as DeleteTaskData).learningCount ?? 0} learning sessions</li>
              </ul>
            </>
          )}
          {data.target === "session" && (
            <>
              <p className="text-slate-300 text-sm">
                Delete this debugging session?
              </p>
              <p className="text-slate-400 text-sm">This will delete all artifacts and scans.</p>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={deleting}
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : `Delete ${data.target === "project" ? "Project" : data.target === "task" ? "Task" : "Session"}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
