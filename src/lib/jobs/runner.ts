import { config } from "../config";
import { runFfmpeg } from "../ffmpeg";
import { fileSize, removeIfExists, resolveInScope } from "../storage";
import { buildPlan } from "../tools/plan";
import type { PlanContext, ProcessPlan } from "../tools/types";
import {
  clearController,
  getJob,
  registerController,
  updateJob,
} from "./store";
import type { Job } from "./types";

/**
 * Execute a job's plan step by step, reporting weighted progress back into the
 * store. Runs in the background (fire-and-forget); the client polls for status.
 */
export async function runJob(job: Job, ctx: PlanContext): Promise<void> {
  const controller = new AbortController();
  registerController(job.id, controller);

  let plan: ProcessPlan;
  try {
    plan = buildPlan(job.tool, ctx);
  } catch (err) {
    updateJob(job.id, {
      status: "error",
      error: `Could not build processing plan: ${(err as Error).message}`,
    });
    clearController(job.id);
    return;
  }

  updateJob(job.id, { status: "running", progress: 0, stepLabel: plan.steps[0]?.label ?? "" });

  const totalWeight = plan.steps.reduce((sum, s) => sum + s.weight, 0) || 1;
  let completedWeight = 0;

  try {
    for (const step of plan.steps) {
      updateJob(job.id, { stepLabel: step.label });

      await runFfmpeg(step.args, {
        signal: controller.signal,
        totalDurationSec: step.trackProgress ? ctx.durationSec : undefined,
        onProgress: step.trackProgress
          ? (fraction) => {
              const overall =
                ((completedWeight + fraction * step.weight) / totalWeight) * 100;
              updateJob(job.id, { progress: Math.min(99, Math.round(overall)) });
            }
          : undefined,
      });

      completedWeight += step.weight;
      updateJob(job.id, {
        progress: Math.min(99, Math.round((completedWeight / totalWeight) * 100)),
      });
    }

    const outBytes = await fileSize(plan.outputPath);
    if (outBytes <= 0) {
      throw new Error("Processing finished but produced an empty file.");
    }

    updateJob(job.id, {
      status: "done",
      progress: 100,
      stepLabel: "Complete",
      output: { scope: "outputs", name: plan.outputName, bytes: outBytes },
      outputKind: plan.outputKind,
    });
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    const cancelled = controller.signal.aborted || /cancelled/i.test(message);
    // Clean up a partial/failed output so it can't be served or counted.
    await removeIfExists(resolveInScope("outputs", plan.outputName));

    updateJob(job.id, {
      status: cancelled ? "cancelled" : "error",
      error: cancelled ? "Job was cancelled." : message,
      stepLabel: cancelled ? "Cancelled" : "Failed",
    });
    if (!cancelled) {
      // eslint-disable-next-line no-console
      console.error(`[clippilot] job ${job.id} (${job.tool}) failed:`, message);
    }
  } finally {
    for (const tmp of plan.cleanup) {
      await removeIfExists(tmp);
    }
    clearController(job.id);
  }
}

/** Build the plan context shared by the runner and any callers. */
export function makePlanContext(
  job: Job,
  opts: { durationSec: number; hasAudio: boolean; outputName: string },
): PlanContext {
  return {
    inputPath: resolveInScope(job.input.scope, job.input.name),
    outputPath: resolveInScope("outputs", opts.outputName),
    outputName: opts.outputName,
    tmpPrefix: `${config.tmpDir}/${job.id}`,
    durationSec: opts.durationSec,
    hasAudio: opts.hasAudio,
    options: job.options,
  };
}

export function isJobCancelled(id: string): boolean {
  return getJob(id)?.status === "cancelled";
}
