"use client";

import { Suspense, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const SIDEBAR_WIDTH = 280;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const selectedTaskId = (() => {
    if (!pathname) return null;
    const match = pathname.match(/\/projects\/[^/]+\/tasks\/([^/]+)/);
    if (match) return match[1] ?? null;
    return null;
  })();

  const selectedProjectId = (() => {
    if (!pathname) return null;
    const match = pathname.match(/\/projects\/([^/]+)/);
    return match ? (match[1] ?? null) : null;
  })();

  const openDrawer = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setMobileDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 text-slate-100">
      {/* Desktop: fixed sidebar always visible (md and up) */}
      <aside
        className="hidden md:flex flex-col shrink-0 border-r border-slate-800 bg-slate-950 text-slate-100"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="Projects and sessions"
      >
        <Suspense fallback={<div className="p-2 text-slate-400 text-sm">Loading…</div>}>
          <Sidebar
            selectedTaskId={selectedTaskId}
            selectedProjectId={selectedProjectId}
            onClose={undefined}
          />
        </Suspense>
      </aside>

      {/* Mobile: Menu button in header */}
      <div className="md:hidden flex h-12 shrink-0 items-center border-b border-slate-800 px-3 bg-slate-950">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-100 hover:bg-slate-800"
          onClick={openDrawer}
          aria-label="Open menu - Projects and sessions"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <span className="ml-2 text-sm font-semibold text-slate-100">Junior Dev Task Manager</span>
      </div>

      {/* Mobile drawer overlay + sidebar */}
      {mobileDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            role="button"
            tabIndex={0}
            onClick={closeDrawer}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Escape") closeDrawer();
            }}
            aria-label="Close menu"
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-[min(100vw,280px)] flex flex-col border-r border-slate-800 bg-slate-950 md:hidden"
            role="dialog"
            aria-label="Projects and sessions"
          >
            <Suspense fallback={<div className="p-2 text-slate-400 text-sm">Loading…</div>}>
              <Sidebar
                selectedTaskId={selectedTaskId}
                selectedProjectId={selectedProjectId}
                onClose={closeDrawer}
              />
            </Suspense>
          </div>
        </>
      )}

      {/* Main content: full height on desktop, below header on mobile */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:min-h-0">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
