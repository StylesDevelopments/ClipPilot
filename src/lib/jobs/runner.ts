import path from "node:path";
import { config } from "../config";
import { runFfmpeg } from "../ffmpeg";
import { probe } from "../ffprobe";
import { removeIfExists } from "../storage";
import { mediaStore, type JobWorkspace } from "../media";
import { getTool } from "../tools/catalog";
import { buildPlan } from "../tools/plan";
import type { PlanContext, ProcessPlan } from "../tools/types";
import { clearController, registerController, updateJob } from "./store";
import type { Job } from "./types";

/** Build the plan context from a prepared workspace. */
function makePlanContext(
  job: Job,
  opts: { inputPath: string; outputPath: string; durationSec: number; hasAudio: boolean },
): PlanContext {
  return {
    inputPath: opts.inputPath,
    outputPath: opts.outputPath,
    outputName: path.basename(opts.outputPath),
    tmpPrefix: path.join(config.tmpDir, job.id),
    durationSec: opts.durationSec,
    hasAudio: opts.hasAudio,
    options: job.options,
  };
}

/**
 * Run a job end-to-end: prepare local working files (downloading from the
 * media store if remote), probe, build the FFmpeg plan, execute it with
 * progress, then persist the output. Fire-and-forget; the client polls status.
 */
export async function startJob(job: Job): Promise<void> {
  const controller = new AbortController();
  registerController(job.id, controller);

  const tool = getTool(job.tool);
  if (!tool) {
    await updateJob(job.id, { status: "error", error: `Unknown tool "${job.tool}".` });
    clearController(job.id);
    return;
  }
  const outputName = `${job.id}.${tool.outputExt}`;

  let workspace: JobWorkspace | undefined;
  let plan: ProcessPlan | undefined;

  try {
    await updateJob(job.id, { status: "running", progress: 0, stepLabel: "Preparing" });
    await mediaStore.init();
    workspace = await mediaStore.prepareJob(job.input.name, outputName);

    const info = await probe(workspace.inputPath).catch(() => null);
    plan = buildPlan(job.tool, makePlanContext(job, {
      inputPath: workspace.inputPath,
      outputPath: workspace.outputPath,
      durationSec: info?.durationSec ?? 0,
      hasAudio: info?.hasAudio ?? false,
    }));

    const totalWeight = plan.steps.reduce((sum, s) => sum + s.weight, 0) || 1;
    let completedWeight = 0;
    let lastWrite = 0;

    for (const step of plan.steps) {
      await updateJob(job.id, { stepLabel: step.label });

      await runFfmpeg(step.args, {
        signal: controller.signal,
        totalDurationSec: step.trackProgress ? info?.durationSec : undefined,
        onProgress: step.trackProgress
          ? (fraction) => {
              const overall =
                ((completedWeight + fraction * step.weight) / totalWeight) * 100;
              // Throttle writes (important when the backend is a database).
              const now = Date.now();
              if (now - lastWrite > 800) {
                lastWrite = now;
                void updateJob(job.id, { progress: Math.min(99, Math.round(overall)) });
              }
            }
          : undefined,
      });

      completedWeight += step.weight;
      await updateJob(job.id, {
        progress: Math.min(99, Math.round((completedWeight / totalWeight) * 100)),
      });
    }

    const outBytes = await workspace.finalize();
    if (outBytes <= 0) throw new Error("Processing finished but produced an empty file.");

    await updateJob(job.id, {
      status: "done",
      progress: 100,
      stepLabel: "Complete",
      output: { scope: "outputs", name: outputName, bytes: outBytes },
      outputKind: plan.outputKind,
    });
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    const cancelled = controller.signal.aborted || /cancelled/i.test(message);
    await mediaStore.remove("outputs", outputName).catch(() => {});
    await updateJob(job.id, {
      status: cancelled ? "cancelled" : "error",
      error: cancelled ? "Job was cancelled." : message,
      stepLabel: cancelled ? "Cancelled" : "Failed",
    });
    if (!cancelled) {
      // eslint-disable-next-line no-console
      console.error(`[clippilot] job ${job.id} (${job.tool}) failed:`, message);
    }
  } finally {
    for (const tmp of plan?.cleanup ?? []) await removeIfExists(tmp);
    if (workspace) await workspace.dispose();
    clearController(job.id);
  }
}
