import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api";
import { abortJob, deleteJob, getJob } from "@/lib/jobs/store";
import { toJobView } from "@/lib/jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

/** Poll job status. */
export async function GET(_req: NextRequest, { params }: Params) {
  const job = await getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  return NextResponse.json({ job: toJobView(job) });
}

/** Cancel a running job (does not remove files). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const unauthorised = requireApiAuth(req);
  if (unauthorised) return unauthorised;

  const job = await getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  const aborted = abortJob(params.id);
  return NextResponse.json({ cancelled: aborted });
}

/** Delete a job and its files. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorised = requireApiAuth(req);
  if (unauthorised) return unauthorised;

  const removed = await deleteJob(params.id);
  if (!removed) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
