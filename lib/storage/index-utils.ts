// Index utilities are no-ops now that data lives in Supabase.
// Kept so existing imports compile without changes.

export type ProjectTasksIndex = Record<string, string[]>;
export type NotesListIndex = Record<string, string[]>;
export type LearningsListIndex = { ids: string[] };

export async function readProjectTasksIndex(): Promise<ProjectTasksIndex | null> { return null; }
export async function writeProjectTasksIndex(_: ProjectTasksIndex): Promise<void> {}
export async function readNotesListIndex(): Promise<NotesListIndex | null> { return null; }
export async function writeNotesListIndex(_: NotesListIndex): Promise<void> {}
export async function readLearningsListIndex(): Promise<LearningsListIndex | null> { return null; }
export async function writeLearningsListIndex(_: LearningsListIndex): Promise<void> {}

export async function addTaskToIndex(_p: string, _t: string): Promise<void> {}
export async function removeTaskFromIndex(_p: string, _t: string): Promise<void> {}
export async function moveTaskInIndex(_op: string, _np: string, _t: string): Promise<void> {}
export async function rebuildProjectTasksIndex(_: () => Promise<Array<{ project_id: string; id: string }>>): Promise<void> {}

export async function addNoteToIndex(_u: string, _n: string): Promise<void> {}
export async function removeNoteFromIndex(_u: string, _n: string): Promise<void> {}
export async function rebuildNotesIndex(_: () => Promise<Array<{ user_id: string; id: string }>>): Promise<void> {}

export async function addLearningToListIndex(_: string): Promise<void> {}
export async function removeLearningFromListIndex(_: string): Promise<void> {}
export async function rebuildLearningsIndex(_: () => Promise<string[]>): Promise<void> {}
