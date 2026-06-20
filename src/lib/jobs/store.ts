import { config } from "../config";
import { removeIfExists, resolveInScope } from "../storage";
import type { Job } from "./types";

/**
 * In-memory job registry. This is intentionally simple: ClipPilot is a
 * single-process, self-hosted app, so a Map is plenty for the MVP. Job files
 * live on disk; this map only tracks live status. If you later run multiple
 * instances, swap this module for Redis/SQLite without touching callers.
 *
 * A module-level singleton survives hot-reloads in dev via globalThis.
 */
const globalForStore = globalThis as unknown as {
  __clippilotJobs?: Map<string, Job>;
  __clippilotControllers?: Map<string, AbortController>;
  __clippilotSweeper?: NodeJS.Timeout;
};

const jobs: Map<string, Job> =
  globalForStore.__clippilotJobs ?? (globalForStore.__clippilotJobs = new Map());

const controllers: Map<string, AbortController> =
  globalForStore.__clippilotControllers ??
  (globalForStore.__clippilotControllers = new Map());

export function putJob(job: Job): void {
  jobs.set(job.id, job);
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
  const existing = jobs.get(id);
  if (!existing) return undefined;
  const next = { ...existing, ...patch, updatedAt: Date.now() };
  jobs.set(id, next);
  return next;
}

export function listJobs(): Job[] {
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function registerController(id: string, controller: AbortController): void {
  controllers.set(id, controller);
}

export function abortJob(id: string): boolean {
  const controller = controllers.get(id);
  if (!controller) return false;
  controller.abort();
  return true;
}

export function clearController(id: string): void {
  controllers.delete(id);
}

/** Remove a job's records and its files from disk. */
export async function deleteJob(id: string): Promise<boolean> {
  const job = jobs.get(id);
  if (!job) return false;
  abortJob(id);
  clearController(id);

  await removeIfExists(resolveInScope(job.input.scope, job.input.name));
  if (job.output) {
    await removeIfExists(resolveInScope(job.output.scope, job.output.name));
  }
  jobs.delete(id);
  return true;
}

/**
 * Periodically drop finished jobs that are older than the TTL. Files are
 * removed too. The sweeper is started lazily and only once.
 */
export function startSweeper(): void {
  if (config.jobTtlMinutes <= 0) return;
  if (globalForStore.__clippilotSweeper) return;

  const intervalMs = 5 * 60 * 1000;
  const ttlMs = config.jobTtlMinutes * 60 * 1000;

  globalForStore.__clippilotSweeper = setInterval(() => {
    const now = Date.now();
    for (const job of jobs.values()) {
      const finished =
        job.status === "done" || job.status === "error" || job.status === "cancelled";
      if (finished && now - job.updatedAt > ttlMs) {
        void deleteJob(job.id);
      }
    }
  }, intervalMs);

  // Don't keep the event loop alive purely for the sweeper.
  globalForStore.__clippilotSweeper.unref?.();
}
