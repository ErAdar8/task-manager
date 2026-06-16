"use client";

import { useState, useEffect, useCallback } from "react";

export type AppMode = "analysis" | "learning";

const STORAGE_KEY = "task-helper-app-mode";

export function useAppMode() {
  const [mode, setModeState] = useState<AppMode>("analysis");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "learning") setModeState("learning");
    setHydrated(true);
  }, []);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "analysis" ? "learning" : "analysis");
  }, [mode, setMode]);

  return { mode, setMode, toggle, hydrated } as const;
}
