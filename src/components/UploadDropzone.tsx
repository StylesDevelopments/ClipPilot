"use client";

import { useCallback, useRef, useState } from "react";
import { uploadVideo, type UploadResponse } from "@/lib/client";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACCEPT = ".mp4,.mov,.m4v";
const ACCEPT_EXT = [".mp4", ".mov", ".m4v"];

interface UploadDropzoneProps {
  maxUploadMb: number;
  onUploaded: (result: UploadResponse, file: File) => void;
}

export function UploadDropzone({ maxUploadMb, onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ACCEPT_EXT.includes(ext)) {
        setError(`Unsupported file type. Allowed: ${ACCEPT_EXT.join(", ")}.`);
        return;
      }
      if (file.size > maxUploadMb * 1024 * 1024) {
        setError(`File is too large. Maximum is ${maxUploadMb} MB.`);
        return;
      }

      setBusy(true);
      setProgress(0);
      try {
        const result = await uploadVideo(file, setProgress);
        onUploaded(result, file);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [maxUploadMb, onUploaded],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50",
          busy && "pointer-events-none opacity-80",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        </span>

        {busy ? (
          <div className="mt-4 w-full max-w-xs">
            <p className="text-sm font-medium text-slate-700">
              Uploading… {Math.round(progress * 100)}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 text-base font-medium text-slate-800">
              Drag &amp; drop a video, or click to browse
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {ACCEPT_EXT.join(", ")} · up to {formatBytes(maxUploadMb * 1024 * 1024)}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
