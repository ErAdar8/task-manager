"use client";

import { ImageIcon } from "lucide-react";
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

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full text-left rounded-lg border overflow-hidden transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-slate-500/50",
        colors.bg,
        colors.border
      )}
    >
      <div className={cn("h-[3px] w-full", colors.bar)} aria-hidden />
      <div className="p-4 space-y-2">
        <h3 className={cn("font-medium line-clamp-2", colors.text)}>{note.title}</h3>
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
    </button>
  );
}
