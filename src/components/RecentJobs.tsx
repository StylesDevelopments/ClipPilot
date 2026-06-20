"use client";

import { fileUrl } from "@/lib/client";
import type { RecentJob } from "@/lib/useRecentJobs";
import { Button } from "@/components/ui/Button";

interface RecentJobsProps {
  jobs: RecentJob[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function RecentJobs({ jobs, onRemove, onClear }: RecentJobsProps) {
  if (jobs.length === 0) return null;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Recent jobs (this browser)</h2>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear list
        </Button>
      </div>
      <ul className="divide-y divide-slate-100">
        {jobs.map((job) => (
          <li key={job.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {job.toolLabel}
            </span>
            <span className="truncate text-slate-700" title={job.originalName}>
              {job.originalName}
            </span>
            <span className="ml-auto flex items-center gap-2">
              {job.status === "done" && job.outputName ? (
                <a
                  href={fileUrl("outputs", job.outputName, true)}
                  download
                  className="font-medium text-brand-600 hover:underline"
                >
                  Download
                </a>
              ) : (
                <span className="text-xs capitalize text-slate-400">{job.status}</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(job.id)}
                aria-label="Remove from list"
                className="text-slate-400 hover:text-slate-600"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        This list is stored only in your browser. Files may be cleared from the
        server automatically after a while.
      </p>
    </section>
  );
}
