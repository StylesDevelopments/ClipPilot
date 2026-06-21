import { config } from "../config";
import { mediaStore } from "../media";
import type { JobStoreBackend } from "./backend";
import { MemoryJobStore } from "./memory";
import { SupabaseJobStore } from "./supabaseJobs";
import type { Job } from "./types";

/**
 * Job registry: a persistence backend (in-memory or Supabase Postgres) plus an
 * in-process map of AbortControllers for live cancellation, and a periodic
 * sweeper that removes expired finished jobs and their files.
 */
const backend: JobStoreBackend =
  config.jobsBackend === "supabase" ? new SupabaseJobStore() : new MemoryJobStore();

const globalForJobs = globalThis as unknown as {
  __clippilotControllers?: Map<string, AbortController>;
  __clippilotSweeper?: NodeJS.Timeout;
};

const controllers: Map<string, AbortController> =
  globalForJobs.__clippilotControllers ??
  (globalForJobs.__clippilotControllers = new Map());

export async function putJob(job: Job): Promise<void> {
  await backend.put(job);
}

export async function getJob(id: string): Promise<Job | undefined> {
  return backend.get(id);
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<Job | undefined> {
  return backend.update(id, patch);
}

export async function listJobs(): Promise<Job[]> {
  return backend.list();
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

/** Remove a job's record and its files. */
export async function deleteJob(id: string): Promise<boolean> {
  const job = await backend.get(id);
  if (!job) return false;
  abortJob(id);
  clearController(id);

  await mediaStore.remove(job.input.scope, job.input.name).catch(() => {});
  if (job.output) {
    await mediaStore.remove(job.output.scope, job.output.name).catch(() => {});
  }
  await backend.remove(id);
  return true;
}

/** Periodically drop finished jobs older than the TTL (and their files). */
export function startSweeper(): void {
  if (config.jobTtlMinutes <= 0) return;
  if (globalForJobs.__clippilotSweeper) return;

  const intervalMs = 5 * 60 * 1000;
  const ttlMs = config.jobTtlMinutes * 60 * 1000;
  // A job that hasn't reported progress for this long is considered dead — e.g.
  // the instance that was running its FFmpeg process was scaled down. Active
  // jobs update their progress every sub-second, so this only catches corpses.
  const staleMs = 30 * 60 * 1000;

  globalForJobs.__clippilotSweeper = setInterval(() => {
    void (async () => {
      const now = Date.now();
      const jobs = await listJobs().catch(() => []);
      for (const job of jobs) {
        const finished =
          job.status === "done" || job.status === "error" || job.status === "cancelled";
        if (finished && now - job.updatedAt > ttlMs) {
          await deleteJob(job.id).catch(() => {});
          continue;
        }
        // Reap jobs stuck in queued/running with no recent update.
        const active = job.status === "queued" || job.status === "running";
        if (active && now - job.updatedAt > staleMs) {
          await updateJob(job.id, {
            status: "error",
            error: "Job stopped unexpectedly (worker no longer running).",
            stepLabel: "Failed",
          }).catch(() => {});
        }
      }
    })();
  }, intervalMs);

  globalForJobs.__clippilotSweeper.unref?.();
}
