"use client";

import { useState } from "react";
import { Paperclip, FileText, Copy, Check } from "lucide-react";
import { getCardColor } from "@/lib/card-colors";
import { stripMarkdownForPreview } from "@/lib/strip-markdown";
import { ImageLightboxTrigger } from "@/components/image-lightbox-trigger";
import type { StandaloneLearning } from "@/schemas/learnings";
import { cn } from "@/lib/utils/cn";

function syntheticHeadline(content: string): string {
  const plain = stripMarkdownForPreview(content);
  return plain.length <= 40 ? plain : `${plain.slice(0, 40)}…`;
}

export function LearningCard({
  learning,
  onOpen,
  className,
}: {
  learning: StandaloneLearning;
  onOpen: () => void;
  className?: string;
}) {
  const colors = getCardColor(learning.id);
  const [copied, setCopied] = useState(false);
  const isFile = learning.cardType === "file";
  const isImage = learning.cardType === "image";
  const imageUrl = isImage ? learning.attachments?.[0] : undefined;
  const title = learning.title?.trim() || syntheticHeadline(learning.content);
  const preview = isFile || isImage ? learning.content : stripMarkdownForPreview(learning.content);

  const cardTypeLabel =
    learning.cardType === "flow" ? "Flow" :
    learning.cardType === "image" ? "Image" :
    learning.cardType === "learning" ? "Learning" :
    learning.cardType === "file" ? "File" : null;

  const src = learning.source;
  const sourceLine =
    src.type === "subtopic" && src.subtopicTitle
      ? `📖 ${src.subtopicTitle}${src.courseName ? ` · ${src.courseName}` : ""}`
      : src.type === "task" && src.taskTitle
        ? `📌 ${src.taskTitle}${src.projectName ? ` · ${src.projectName}` : ""}`
        : "🌐 General";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "w-full text-left rounded-lg border overflow-hidden transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-slate-500/50 cursor-pointer group",
        colors.bg,
        colors.border,
        className
      )}
    >
      <div className={cn("h-[3px] w-full", colors.bar)} aria-hidden />
      {isImage && imageUrl && (
        <div
          className="border-b border-black/20 bg-black/20"
          onClick={(e) => e.stopPropagation()}
        >
          <ImageLightboxTrigger
            src={imageUrl}
            alt={title}
            className="block w-full"
            imgClassName="w-full max-h-40 object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          {isFile && <FileText className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" aria-hidden />}
          <h3 className={cn("font-medium line-clamp-2 flex-1 min-w-0", colors.text)}>{title}</h3>
          {!isFile && !isImage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(learning.content).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              title="Copy content"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-700/50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-400 line-clamp-3">{preview || "—"}</p>
        <div className="flex flex-wrap gap-1">
          {cardTypeLabel && (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {cardTypeLabel}
            </span>
          )}
          {learning.category && (
            <span className={cn("inline-block text-[10px] px-2 py-0.5 rounded border", colors.border, colors.accent)}>
              {learning.category}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <span className="truncate min-w-0" title={sourceLine}>{sourceLine}</span>
          {!isFile && !isImage && (
            <span className="inline-flex items-center gap-0.5 shrink-0">
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              {(learning.attachments?.length ?? 0) > 0 ? learning.attachments!.length : "0"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
