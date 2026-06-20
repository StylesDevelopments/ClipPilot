"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ToolPicker } from "@/components/ToolPicker";
import { ToolOptions } from "@/components/ToolOptions";
import { JobProgress } from "@/components/JobProgress";
import { ResultView } from "@/components/ResultView";
import { RecentJobs } from "@/components/RecentJobs";
import { Button } from "@/components/ui/Button";
import {
  cancelJob,
  cleanupAll,
  createJob,
  fetchJob,
  type UploadResponse,
} from "@/lib/client";
import { getTool, withDefaults } from "@/lib/tools/catalog";
import type { ToolId, ToolOptions as Options } from "@/lib/tools/types";
import type { JobView } from "@/lib/jobs/types";
import { useRecentJobs } from "@/lib/useRecentJobs";
import { formatBytes, formatDuration } from "@/lib/utils";

type Step = "upload" | "configure" | "processing" | "result";

export default function WorkspacePage() {
  const [maxUploadMb, setMaxUploadMb] = useState(200);
  const [step, setStep] = useState<Step>("upload");
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [tool, setTool] = useState<ToolId>("stabilise");
  const [options, setOptions] = useState<Options>(() =>
    withDefaults(getTool("stabilise")!),
  );
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recent = useRecentJobs();
  const toolMeta = getTool(tool)!;

  useEffect(() => {
    fetch("/api/upload")
      .then((r) => r.json())
      .then((d) => typeof d.maxUploadMb === "number" && setMaxUploadMb(d.maxUploadMb))
      .catch(() => {});
  }, []);

  // Reset options to the selected tool's defaults whenever the tool changes.
  const selectTool = useCallback((id: ToolId) => {
    setTool(id);
    setOptions(withDefaults(getTool(id)!));
  }, []);

  const onUploaded = useCallback((result: UploadResponse) => {
    setUpload(result);
    setError(null);
    setStep("configure");
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!upload) return;
    setError(null);
    try {
      const created = await createJob(tool, upload.upload, options);
      setJob(created);
      setStep("processing");
      recent.upsert({
        id: created.id,
        tool,
        toolLabel: toolMeta.label,
        originalName: upload.upload.originalName,
        outputKind: toolMeta.outputKind,
        status: created.status,
        createdAt: created.createdAt,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }, [upload, tool, options, toolMeta, recent]);

  // Poll the job while it is running.
  useEffect(() => {
    if (step !== "processing" || !job) return;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const latest = await fetchJob(job.id);
        setJob(latest);
        if (latest.status === "done") {
          stopPolling();
          setStep("result");
          recent.upsert({
            id: latest.id,
            tool,
            toolLabel: toolMeta.label,
            originalName: upload?.upload.originalName ?? latest.input.name,
            outputName: latest.output?.name,
            outputScope: "outputs",
            outputKind: latest.outputKind,
            status: "done",
            createdAt: latest.createdAt,
          });
        } else if (latest.status === "error" || latest.status === "cancelled") {
          stopPolling();
          setError(latest.error ?? "Processing failed.");
          setStep("configure");
        }
      } catch {
        /* transient poll error; keep trying */
      }
    }, 1000);
    return stopPolling;
  }, [step, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCancel = useCallback(async () => {
    if (job) await cancelJob(job.id);
  }, [job]);

  const reset = useCallback(() => {
    stopPolling();
    setUpload(null);
    setJob(null);
    setError(null);
    setStep("upload");
    selectTool("stabilise");
  }, [stopPolling, selectTool]);

  const onCleanup = useCallback(async () => {
    if (!window.confirm("Delete all uploaded and processed files from the server?")) {
      return;
    }
    try {
      await cleanupAll();
      recent.clear();
      reset();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [recent, reset]);

  const meta = upload?.info;
  const metaBits = useMemo(() => {
    if (!upload) return [];
    const bits = [formatBytes(upload.upload.bytes)];
    if (meta?.durationSec) bits.push(formatDuration(meta.durationSec));
    if (meta?.width && meta?.height) bits.push(`${meta.width}×${meta.height}`);
    if (meta && !meta.hasAudio) bits.push("no audio");
    return bits;
  }, [upload, meta]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload a clip, choose a tool, and process it locally.
          </p>
        </div>
        {step !== "upload" && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Start over
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "upload" && (
        <UploadDropzone maxUploadMb={maxUploadMb} onUploaded={onUploaded} />
      )}

      {(step === "configure" || step === "processing") && upload && (
        <div className="space-y-5">
          <div className="card flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {upload.upload.originalName}
              </p>
              <p className="text-xs text-slate-500">{metaBits.join(" · ")}</p>
            </div>
          </div>

          {step === "configure" && (
            <>
              <div>
                <h2 className="mb-2 text-sm font-semibold text-slate-700">Choose a tool</h2>
                <ToolPicker selected={tool} onSelect={selectTool} />
              </div>

              <div className="card p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  {toolMeta.label}
                </h2>
                <p className="mb-4 mt-0.5 text-sm text-slate-500">
                  {toolMeta.description}
                </p>
                <ToolOptions
                  tool={toolMeta}
                  values={options}
                  onChange={(key, value) =>
                    setOptions((prev) => ({ ...prev, [key]: value }))
                  }
                />
                <div className="mt-5 flex justify-end">
                  <Button onClick={start}>Run {toolMeta.label.toLowerCase()}</Button>
                </div>
              </div>
            </>
          )}

          {step === "processing" && job && (
            <JobProgress job={job} onCancel={onCancel} />
          )}
        </div>
      )}

      {step === "result" && job && upload && (
        <ResultView
          job={job}
          originalName={upload.upload.originalName}
          onReset={reset}
        />
      )}

      <RecentJobs jobs={recent.jobs} onRemove={recent.remove} onClear={recent.clear} />

      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <p className="text-xs text-slate-400">
          Files stay on this server and are never shared externally.
        </p>
        <Button variant="danger" size="sm" onClick={onCleanup}>
          Delete all files
        </Button>
      </div>
    </div>
  );
}
