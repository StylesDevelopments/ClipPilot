"use client";

import type { JobView } from "@/lib/jobs/types";
import { fileUrl } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { formatBytes, sizeDeltaPercent } from "@/lib/utils";

interface ResultViewProps {
  job: JobView;
  originalName: string;
  onReset: () => void;
}

export function ResultView({ job, originalName, onReset }: ResultViewProps) {
  if (!job.output) return null;

  const originalUrl = fileUrl(job.input.scope, job.input.name);
  const outputUrl = fileUrl(job.output.scope, job.output.name);
  const downloadUrl = fileUrl(job.output.scope, job.output.name, true);

  const delta = sizeDeltaPercent(job.input.bytes, job.output.bytes);
  const smaller = delta < 0;
  const isImage = job.outputKind === "image";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
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
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Done! Your {isImage ? "thumbnail" : "video"} is ready.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600">
            Original · {formatBytes(job.input.bytes)}
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={originalUrl} controls className="aspect-video w-full bg-black" />
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm">
            <span className="font-medium text-slate-600">
              Result · {formatBytes(job.output.bytes)}
            </span>
            {!isImage && delta !== 0 && (
              <span
                className={
                  smaller
                    ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                    : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                }
              >
                {smaller ? "↓" : "↑"} {Math.abs(delta)}% {smaller ? "smaller" : "larger"}
              </span>
            )}
          </div>
          {isImage ? (
            <img src={outputUrl} alt="Extracted thumbnail" className="w-full bg-black" />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={outputUrl} controls className="aspect-video w-full bg-black" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a href={downloadUrl} download>
          <Button>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download {isImage ? "image" : "video"}
          </Button>
        </a>
        <Button variant="secondary" onClick={onReset}>
          Process another video
        </Button>
        <span className="text-xs text-slate-400">From {originalName}</span>
      </div>
    </div>
  );
}
