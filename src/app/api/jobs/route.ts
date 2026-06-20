import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireApiAuth } from "@/lib/api";
import { probe } from "@/lib/ffprobe";
import { ensureStorage, fileSize, resolveInScope } from "@/lib/storage";
import { getTool, withDefaults } from "@/lib/tools/catalog";
import type { ToolId } from "@/lib/tools/types";
import { makePlanContext, runJob } from "@/lib/jobs/runner";
import { putJob, startSweeper } from "@/lib/jobs/store";
import { toJobView, type Job } from "@/lib/jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateJobBody {
  tool?: string;
  upload?: { name?: string };
  options?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const unauthorised = requireApiAuth(req);
  if (unauthorised) return unauthorised;

  try {
    await ensureStorage();
    startSweeper();

    const body = (await req.json()) as CreateJobBody;
    const tool = getTool(String(body.tool ?? ""));
    if (!tool) {
      return NextResponse.json({ error: "Unknown tool." }, { status: 400 });
    }

    const uploadName = body.upload?.name;
    if (!uploadName) {
      return NextResponse.json({ error: "Missing upload reference." }, { status: 400 });
    }

    // Resolve guards against traversal; existence check guards against bad refs.
    const inputPath = resolveInScope("uploads", uploadName);
    const inputBytes = await fileSize(inputPath);
    if (inputBytes <= 0) {
      return NextResponse.json({ error: "Uploaded file not found." }, { status: 404 });
    }

    const info = await probe(inputPath).catch(() => null);
    const durationSec = info?.durationSec ?? 0;
    const hasAudio = info?.hasAudio ?? false;

    const options = withDefaults(tool, body.options ?? {});
    const id = nanoid(12);
    const outputName = `${id}.${tool.outputExt}`;

    const job: Job = {
      id,
      tool: tool.id as ToolId,
      status: "queued",
      progress: 0,
      stepLabel: "Queued",
      options,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      input: { scope: "uploads", name: uploadName, bytes: inputBytes },
      outputKind: tool.outputKind,
    };
    putJob(job);

    const ctx = makePlanContext(job, { durationSec, hasAudio, outputName });
    // Fire-and-forget: the client polls GET /api/jobs/:id for progress.
    void runJob(job, ctx);

    return NextResponse.json({ job: toJobView(job) }, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[clippilot] job creation failed:", err);
    return NextResponse.json({ error: "Could not start job." }, { status: 500 });
  }
}
