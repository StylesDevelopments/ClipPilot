import { getSupabase } from "../supabase";
import type { JobStoreBackend } from "./backend";
import type { Job, JobFileRef, JobStatus } from "./types";
import type { OutputKind, ToolId, ToolOptions } from "../tools/types";

const TABLE = "jobs";

interface JobRow {
  id: string;
  tool: string;
  status: string;
  progress: number;
  step_label: string;
  options: ToolOptions;
  created_at: number;
  updated_at: number;
  input: JobFileRef;
  output: JobFileRef | null;
  output_kind: string;
  error: string | null;
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    tool: row.tool as ToolId,
    status: row.status as JobStatus,
    progress: row.progress,
    stepLabel: row.step_label,
    options: row.options ?? {},
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    input: row.input,
    output: row.output ?? undefined,
    outputKind: row.output_kind as OutputKind,
    error: row.error ?? undefined,
  };
}

function jobToRow(job: Job): JobRow {
  return {
    id: job.id,
    tool: job.tool,
    status: job.status,
    progress: job.progress,
    step_label: job.stepLabel,
    options: job.options,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    input: job.input,
    output: job.output ?? null,
    output_kind: job.outputKind,
    error: job.error ?? null,
  };
}

/** Maps a partial Job patch onto row columns (only the provided fields). */
function patchToRow(patch: Partial<Job>): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: Date.now() };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.progress !== undefined) row.progress = patch.progress;
  if (patch.stepLabel !== undefined) row.step_label = patch.stepLabel;
  if (patch.output !== undefined) row.output = patch.output ?? null;
  if (patch.outputKind !== undefined) row.output_kind = patch.outputKind;
  if (patch.error !== undefined) row.error = patch.error ?? null;
  if (patch.options !== undefined) row.options = patch.options;
  return row;
}

/** Supabase Postgres-backed job store (table: public.jobs). */
export class SupabaseJobStore implements JobStoreBackend {
  async get(id: string): Promise<Job | undefined> {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`jobs.get failed: ${error.message}`);
    return data ? rowToJob(data as JobRow) : undefined;
  }

  async put(job: Job): Promise<void> {
    const { error } = await getSupabase().from(TABLE).upsert(jobToRow(job));
    if (error) throw new Error(`jobs.put failed: ${error.message}`);
  }

  async update(id: string, patch: Partial<Job>): Promise<Job | undefined> {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .update(patchToRow(patch))
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`jobs.update failed: ${error.message}`);
    return data ? rowToJob(data as JobRow) : undefined;
  }

  async list(): Promise<Job[]> {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`jobs.list failed: ${error.message}`);
    return (data as JobRow[]).map(rowToJob);
  }

  async remove(id: string): Promise<boolean> {
    const { error } = await getSupabase().from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`jobs.remove failed: ${error.message}`);
    return true;
  }
}
