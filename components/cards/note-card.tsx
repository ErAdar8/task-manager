"use client";

import { useState } from "react";
import { ImageIcon, Copy, Check } from "lucide-react";
import { getCardColor } from "@/lib/card-colors";
import { stripMarkdownForPreview } from "@/lib/strip-markdown";
import type { GenericNote } from "@/schemas/notes";
import { cn } from "@/lib/utils/cn";

function hasImageInContent(content: string): boolean {
  return /!\[[^\]]*\]\(|data:image\//i.test(content);
}

export function NoteCard({
  note,
  onOpen,
}: {
  note: GenericNote;
  onOpen: () => void;
}) {
  const colors = getCardColor(note.id);
  const preview = stripMarkdownForPreview(note.content);
  const tags = note.tags ?? [];
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(note.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={cn(
        "w-full text-left rounded-lg border overflow-hidden transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-slate-500/50 cursor-pointer group",
        colors.bg,
        colors.border
      )}
    >
      <div className={cn("h-[3px] w-full", colors.bar)} aria-hidden />
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn("font-medium line-clamp-2 flex-1 min-w-0", colors.text)}>{note.title}</h3>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy content"
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-700/50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-sm text-slate-400 line-clamp-3">{preview || "—"}</p>
        <div className="flex flex-wrap gap-1.5 items-center justify-between gap-y-2">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  colors.border,
                  colors.accent
                )}
              >
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] text-slate-500">+{tags.length - 4}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500">
            {hasImageInContent(note.content) && (
              <span title="Contains images" className="inline-flex items-center gap-0.5">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
            <time dateTime={note.updated_at}>
              {new Date(note.updated_at).toLocaleDateString()}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
}
