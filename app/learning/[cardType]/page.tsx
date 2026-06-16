"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { LearningCard } from "@/components/cards/learning-card";
import { LearningModal } from "@/components/modals/learning-modal";
import type { StandaloneLearning, CardType } from "@/schemas/learnings";

const CARD_TYPE_LABELS: Record<string, string> = {
  note: "Notes",
  learning: "Learnings",
  flow: "Flows",
  image: "Images",
};

type GroupedByCourse = {
  courseId: string;
  courseName: string;
  subtopics: {
    subtopicId: string;
    subtopicTitle: string;
    cards: StandaloneLearning[];
  }[];
};

export default function LearningBrowsePage() {
  const params = useParams();
  const cardType = params.cardType as string;
  const label = CARD_TYPE_LABELS[cardType] ?? cardType;

  const [groups, setGroups] = useState<GroupedByCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StandaloneLearning | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learnings?source=subtopic&cardType=${encodeURIComponent(cardType)}`);
      const json = (await res.json()) as { success: boolean; data?: StandaloneLearning[] };
      if (!json.success || !json.data) return;

      const map = new Map<string, GroupedByCourse>();
      for (const card of json.data) {
        const { courseId = "", courseName = "Unknown Course", subtopicId = "", subtopicTitle = "Unknown Subtopic" } = card.source;
        if (!map.has(courseId)) {
          map.set(courseId, { courseId, courseName, subtopics: [] });
        }
        const course = map.get(courseId)!;
        let sub = course.subtopics.find((s) => s.subtopicId === subtopicId);
        if (!sub) {
          sub = { subtopicId, subtopicTitle, cards: [] };
          course.subtopics.push(sub);
        }
        sub.cards.push(card);
      }
      setGroups(Array.from(map.values()));
    } finally {
      setLoading(false);
    }
  }, [cardType]);

  useEffect(() => { void load(); }, [load]);

  const total = groups.reduce((acc, g) => acc + g.subtopics.reduce((a, s) => a + s.cards.length, 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{label}</h1>
        {!loading && <p className="text-sm text-slate-400 mt-1">{total} card{total !== 1 ? "s" : ""} across all courses</p>}
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}

      {!loading && groups.length === 0 && (
        <p className="text-slate-500">No {label.toLowerCase()} yet. Create cards in a subtopic and set their type to &ldquo;{cardType}&rdquo;.</p>
      )}

      {groups.map((course) => (
        <div key={course.courseId} className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-2">
            {course.courseName}
          </h2>
          {course.subtopics.map((sub) => (
            <div key={sub.subtopicId} className="space-y-2 pl-3">
              <h3 className="text-sm font-medium text-slate-400">{sub.subtopicTitle}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {sub.cards.map((card) => (
                  <LearningCard
                    key={card.id}
                    learning={card}
                    onOpen={() => setSelected(card)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      <LearningModal
        open={selected !== null}
        learning={selected}
        onClose={() => setSelected(null)}
        onSaved={() => { setSelected(null); void load(); }}
      />
    </div>
  );
}
