import type { OutputKind, ToolId, ToolOptions } from "../tools/types";

export type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface JobFileRef {
  scope: "uploads" | "outputs";
  name: string;
  bytes: number;
}

export interface Job {
  id: string;
  tool: ToolId;
  status: JobStatus;
  /** 0–100. */
  progress: number;
  /** Human-readable label for the current step. */
  stepLabel: string;
  options: ToolOptions;
  createdAt: number;
  updatedAt: number;

  input: JobFileRef;
  output?: JobFileRef;
  outputKind: OutputKind;

  error?: string;
}

/** The trimmed-down shape returned to the browser. */
export interface JobView {
  id: string;
  tool: ToolId;
  status: JobStatus;
  progress: number;
  stepLabel: string;
  createdAt: number;
  outputKind: OutputKind;
  input: JobFileRef;
  output?: JobFileRef;
  error?: string;
}

export function toJobView(job: Job): JobView {
  return {
    id: job.id,
    tool: job.tool,
    status: job.status,
    progress: job.progress,
    stepLabel: job.stepLabel,
    createdAt: job.createdAt,
    outputKind: job.outputKind,
    input: job.input,
    output: job.output,
    error: job.error,
  };
}
