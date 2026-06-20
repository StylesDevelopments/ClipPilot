import type { MediaInfo } from "./ffprobe";
import type { JobView } from "./jobs/types";
import type { ToolOptions } from "./tools/types";

export interface UploadRef {
  scope: "uploads";
  name: string;
  originalName: string;
  bytes: number;
}

export interface UploadResponse {
  upload: UploadRef;
  info: MediaInfo | null;
}

async function asError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    /* ignore non-JSON bodies */
  }
  throw new Error(message);
}

/** Upload a file with progress reporting (XHR exposes upload progress). */
export function uploadVideo(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as UploadResponse);
        else reject(new Error(data?.error ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error("Upload failed: invalid server response."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error."));
    xhr.send(form);
  });
}

export async function createJob(
  tool: string,
  upload: UploadRef,
  options: ToolOptions,
): Promise<JobView> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, upload: { name: upload.name }, options }),
  });
  if (!res.ok) await asError(res);
  return (await res.json()).job as JobView;
}

export async function fetchJob(id: string): Promise<JobView> {
  const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
  if (!res.ok) await asError(res);
  return (await res.json()).job as JobView;
}

export async function cancelJob(id: string): Promise<void> {
  await fetch(`/api/jobs/${id}`, { method: "PATCH" });
}

export async function deleteJob(id: string): Promise<void> {
  await fetch(`/api/jobs/${id}`, { method: "DELETE" });
}

export async function cleanupAll(): Promise<number> {
  const res = await fetch("/api/cleanup", { method: "POST" });
  if (!res.ok) await asError(res);
  return (await res.json()).removed as number;
}

export function fileUrl(
  scope: "uploads" | "outputs",
  name: string,
  download = false,
): string {
  return `/api/files/${scope}/${encodeURIComponent(name)}${download ? "?download=1" : ""}`;
}
