"use client";

import type { JobView } from "@/lib/jobs/types";
import { Button } from "@/components/ui/Button";

interface JobProgressProps {
  job: JobView;
  onCancel: () => void;
}

export function JobProgress({ job, onCancel }: JobProgressProps) {
  const pct = Math.max(2, job.progress);
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
        </span>
        <h3 className="text-base font-semibold text-slate-900">
          {job.stepLabel || "Processing…"}
        </h3>
        <span className="ml-auto text-sm font-medium text-slate-500">
          {job.progress}%
        </span>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          This runs on the server — you can keep this tab open.
        </p>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
