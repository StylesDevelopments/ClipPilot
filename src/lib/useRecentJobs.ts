"use client";

import { useCallback, useEffect, useState } from "react";
import type { ToolId } from "./tools/types";

export interface RecentJob {
  id: string;
  tool: ToolId;
  toolLabel: string;
  originalName: string;
  outputName?: string;
  outputScope?: "outputs";
  outputKind: "video" | "image";
  status: string;
  createdAt: number;
}

const KEY = "clippilot.recentJobs";
const MAX = 12;

function read(): RecentJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentJob[]) : [];
  } catch {
    return [];
  }
}

/**
 * Tracks the current browser's recent jobs in localStorage only — no server
 * state, no accounts. Survives reloads; scoped to this browser.
 */
export function useRecentJobs() {
  const [jobs, setJobs] = useState<RecentJob[]>([]);

  useEffect(() => {
    setJobs(read());
  }, []);

  const persist = useCallback((next: RecentJob[]) => {
    setJobs(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }, []);

  const upsert = useCallback(
    (job: RecentJob) => {
      const next = [job, ...read().filter((j) => j.id !== job.id)].slice(0, MAX);
      persist(next);
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(read().filter((j) => j.id !== id));
    },
    [persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { jobs, upsert, remove, clear };
}
