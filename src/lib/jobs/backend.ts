import type { Job } from "./types";

/**
 * Persistence backend for job records. Implementations: in-memory (default)
 * and Supabase Postgres. The live cancellation controllers stay in-process
 * regardless of backend (the FFmpeg child runs in this Node process).
 */
export interface JobStoreBackend {
  get(id: string): Promise<Job | undefined>;
  put(job: Job): Promise<void>;
  update(id: string, patch: Partial<Job>): Promise<Job | undefined>;
  list(): Promise<Job[]>;
  /** Remove the record only; file cleanup is handled by the caller. */
  remove(id: string): Promise<boolean>;
}
