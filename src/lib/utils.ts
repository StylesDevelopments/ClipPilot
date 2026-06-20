import { clsx, type ClassValue } from "clsx";

/** Tailwind-friendly className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Human-readable file size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** Seconds -> "m:ss" (or "h:mm:ss"). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Signed percentage change between two sizes, e.g. -42 (smaller) or +12. */
export function sizeDeltaPercent(before: number, after: number): number {
  if (!before) return 0;
  return Math.round(((after - before) / before) * 100);
}

/** Parse "HH:MM:SS.ms" or seconds into a number of seconds; NaN if invalid. */
export function parseTimecode(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return NaN;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number.parseFloat(trimmed);
  const parts = trimmed.split(":").map((p) => Number.parseFloat(p));
  if (parts.some((p) => Number.isNaN(p))) return NaN;
  return parts.reduce((acc, part) => acc * 60 + part, 0);
}
