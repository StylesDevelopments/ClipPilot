import type { JobStoreBackend } from "./backend";
import type { Job } from "./types";

/**
 * In-memory job store — the zero-config default. A module-level singleton
 * survives hot-reloads in dev via globalThis. Perfect for single-process
 * local/self-hosted use.
 */
const globalForJobs = globalThis as unknown as {
  __clippilotJobsMap?: Map<string, Job>;
};

const jobs: Map<string, Job> =
  globalForJobs.__clippilotJobsMap ?? (globalForJobs.__clippilotJobsMap = new Map());

export class MemoryJobStore implements JobStoreBackend {
  async get(id: string): Promise<Job | undefined> {
    return jobs.get(id);
  }

  async put(job: Job): Promise<void> {
    jobs.set(job.id, job);
  }

  async update(id: string, patch: Partial<Job>): Promise<Job | undefined> {
    const existing = jobs.get(id);
    if (!existing) return undefined;
    const next = { ...existing, ...patch, updatedAt: Date.now() };
    jobs.set(id, next);
    return next;
  }

  async list(): Promise<Job[]> {
    return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  async remove(id: string): Promise<boolean> {
    return jobs.delete(id);
  }
}
