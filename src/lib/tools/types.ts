// Pure types + shared shapes for the tool system.
// This file must stay free of Node-only imports so it can be used on the client.

export type ToolId = "stabilise" | "compress" | "convert" | "trim" | "thumbnail";

export type OutputKind = "video" | "image";

export interface OptionChoice {
  value: string;
  label: string;
}

export interface OptionField {
  key: string;
  label: string;
  type: "select" | "toggle" | "text";
  default: string | boolean;
  choices?: OptionChoice[];
  help?: string;
  placeholder?: string;
}

export interface ToolMeta {
  id: ToolId;
  label: string;
  tagline: string;
  description: string;
  outputKind: OutputKind;
  /** File extension (no dot) for the produced file. */
  outputExt: string;
  fields: OptionField[];
}

/** Raw option values coming from the client. */
export type ToolOptions = Record<string, string | boolean>;

/** A single ffmpeg invocation within a plan. */
export interface ProcessStep {
  label: string;
  args: string[];
  /** Relative weight for overall progress (steps need not be equal cost). */
  weight: number;
  /** Whether this step reports `time=` progress we can track. */
  trackProgress: boolean;
}

export interface ProcessPlan {
  steps: ProcessStep[];
  outputPath: string;
  outputName: string;
  outputKind: OutputKind;
  /** Temp files to delete once the job finishes (success or failure). */
  cleanup: string[];
}

export interface PlanContext {
  inputPath: string;
  outputPath: string;
  outputName: string;
  /** Absolute path prefix (in the tmp dir) for any intermediate files. */
  tmpPrefix: string;
  durationSec: number;
  hasAudio: boolean;
  options: ToolOptions;
}
