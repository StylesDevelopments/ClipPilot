import path from "node:path";

/**
 * Central, typed configuration resolved from environment variables.
 * Every value has a sensible default so the app runs with zero config.
 */
function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const storageDir = path.resolve(process.env.STORAGE_DIR ?? "./storage");

// Supabase is auto-detected: if a URL + service-role key are present we use it
// for both storage and job persistence, unless explicitly overridden. This
// keeps `npm run dev` zero-config (local) while a deployed instance just needs
// the env vars set.
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const supabaseReady = Boolean(supabaseUrl && supabaseServiceKey);

function pickBackend(envVar: string | undefined): "local" | "supabase" {
  const v = (envVar ?? "").trim().toLowerCase();
  if (v === "local" || v === "supabase") return v;
  return supabaseReady ? "supabase" : "local";
}

export const config = {
  /** Maximum upload size in bytes. */
  maxUploadBytes: intFromEnv(process.env.MAX_UPLOAD_MB, 200) * 1024 * 1024,
  maxUploadMb: intFromEnv(process.env.MAX_UPLOAD_MB, 200),

  /** Storage roots. */
  storageDir,
  uploadsDir: path.join(storageDir, "uploads"),
  outputsDir: path.join(storageDir, "outputs"),
  tmpDir: path.join(storageDir, "tmp"),

  /** Binaries. */
  ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH ?? "ffprobe",

  /** Auto-sweep of finished jobs (minutes). 0 disables it. */
  jobTtlMinutes: intFromEnv(process.env.JOB_TTL_MINUTES, 180),

  /**
   * Optional API bearer token. When set, mutating API routes require an
   * `Authorization: Bearer <token>` header. Empty = open (the MVP default),
   * which is fine for local/self-hosted use behind your own network.
   */
  apiToken: (process.env.API_TOKEN ?? "").trim(),

  /**
   * Optional CORS allow-list for using ClipPilot as a backend API from another
   * origin. Comma-separated list, or "*" for any. Empty = same-origin only.
   */
  corsOrigins: (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  /** Supabase (optional). */
  supabaseUrl,
  supabaseServiceKey,
  supabaseReady,
  supabaseBucket: (process.env.SUPABASE_BUCKET ?? "media").trim(),
  /** Seconds a signed download/preview URL stays valid. */
  signedUrlTtl: intFromEnv(process.env.SIGNED_URL_TTL, 3600),

  /** Active backends. Default to Supabase when configured, else local. */
  storageBackend: pickBackend(process.env.STORAGE_BACKEND),
  jobsBackend: pickBackend(process.env.JOBS_BACKEND),

  /** Accepted upload formats. */
  acceptedExtensions: [".mp4", ".mov", ".m4v"] as const,
  acceptedMimeTypes: [
    "video/mp4",
    "video/quicktime",
    "video/x-m4v",
    "application/octet-stream", // some browsers send this for .mov
  ] as const,
} as const;

export type AppConfig = typeof config;
