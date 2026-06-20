import { parseTimecode } from "../utils";
import type { PlanContext, ProcessPlan, ProcessStep, ToolId, ToolOptions } from "./types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const QUALITY_PRESETS: Record<string, { preset: string; crf: string }> = {
  fast: { preset: "veryfast", crf: "26" },
  balanced: { preset: "medium", crf: "22" },
  high: { preset: "slow", crf: "18" },
};

const STABILISE_STRENGTH: Record<string, { shakiness: number; smoothing: number }> = {
  low: { shakiness: 4, smoothing: 8 },
  medium: { shakiness: 7, smoothing: 15 },
  high: { shakiness: 10, smoothing: 30 },
};

/**
 * Resolve trim options into ffmpeg seek args plus the effective duration used
 * for progress tracking. `-ss` is placed before `-i` (fast seek) and `-t`
 * (duration) after, which is unambiguous regardless of ffmpeg version.
 */
function resolveTrim(
  options: ToolOptions,
  totalDuration: number,
): { pre: string[]; post: string[]; effectiveDuration: number } {
  const start = parseTimecode(String(options.trimStart ?? ""));
  const end = parseTimecode(String(options.trimEnd ?? ""));

  const hasStart = Number.isFinite(start) && start > 0;
  const hasEnd = Number.isFinite(end) && end > 0;

  const startSec = hasStart ? start : 0;
  const endSec = hasEnd ? end : totalDuration;
  const duration = Math.max(0, endSec - startSec) || totalDuration;

  const pre: string[] = hasStart ? ["-ss", startSec.toString()] : [];
  const post: string[] = hasEnd && endSec > startSec ? ["-t", duration.toString()] : [];

  return { pre, post, effectiveDuration: duration };
}

/** Audio mapping: copy original audio unless asked to remove it. */
function audioArgs(removeAudio: boolean): string[] {
  return removeAudio ? ["-an"] : ["-map", "0:a:0?", "-c:a", "copy"];
}

// ---------------------------------------------------------------------------
// Tool builders
// ---------------------------------------------------------------------------

function buildStabilise(ctx: PlanContext): ProcessPlan {
  const { strength, zoom, quality, removeAudio } = ctx.options;
  const s = STABILISE_STRENGTH[String(strength)] ?? STABILISE_STRENGTH.medium;
  const q = QUALITY_PRESETS[String(quality)] ?? QUALITY_PRESETS.balanced;
  const trim = resolveTrim(ctx.options, ctx.durationSec);

  const trfPath = `${ctx.tmpPrefix}.trf`;

  // Pass 1: analyse motion. Trim is applied identically to both passes so the
  // transform data aligns with the frames we later warp.
  const detectArgs = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stats",
    ...trim.pre,
    "-i",
    ctx.inputPath,
    ...trim.post,
    "-vf",
    `vidstabdetect=shakiness=${s.shakiness}:accuracy=15:result=${trfPath}`,
    "-f",
    "null",
    "-",
  ];

  // Zoom: "auto" lets vidstab pick (optzoom=1); a fixed factor maps to a
  // percentage zoom with optzoom disabled.
  const zoomStr = String(zoom);
  const zoomFilter =
    zoomStr === "auto"
      ? "optzoom=1"
      : `optzoom=0:zoom=${Math.round((Number.parseFloat(zoomStr) - 1) * 100)}`;

  const transformArgs = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stats",
    "-y",
    ...trim.pre,
    "-i",
    ctx.inputPath,
    ...trim.post,
    "-vf",
    `vidstabtransform=input=${trfPath}:smoothing=${s.smoothing}:${zoomFilter},unsharp=5:5:0.8:3:3:0.4`,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    q.preset,
    "-crf",
    q.crf,
    "-pix_fmt",
    "yuv420p",
    ...audioArgs(Boolean(removeAudio)),
    "-movflags",
    "+faststart",
    ctx.outputPath,
  ];

  const steps: ProcessStep[] = [
    { label: "Analysing motion", args: detectArgs, weight: 1, trackProgress: true },
    { label: "Stabilising & encoding", args: transformArgs, weight: 1.5, trackProgress: true },
  ];

  return {
    steps,
    outputPath: ctx.outputPath,
    outputName: ctx.outputName,
    outputKind: "video",
    cleanup: [trfPath],
  };
}

function buildCompress(ctx: PlanContext): ProcessPlan {
  const level = String(ctx.options.level ?? "medium");
  const resolution = String(ctx.options.resolution ?? "keep");
  const crf = level === "light" ? "23" : level === "strong" ? "32" : "28";

  const filters: string[] = [];
  if (resolution !== "keep") {
    // Scale to target height, keep aspect, ensure even width.
    filters.push(`scale=-2:${resolution}`);
  }

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stats",
    "-y",
    "-i",
    ctx.inputPath,
    ...(filters.length ? ["-vf", filters.join(",")] : []),
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    crf,
    "-pix_fmt",
    "yuv420p",
    ...audioArgs(Boolean(ctx.options.removeAudio)),
    "-movflags",
    "+faststart",
    ctx.outputPath,
  ];

  return {
    steps: [{ label: "Compressing", args, weight: 1, trackProgress: true }],
    outputPath: ctx.outputPath,
    outputName: ctx.outputName,
    outputKind: "video",
    cleanup: [],
  };
}

function buildConvert(ctx: PlanContext): ProcessPlan {
  const q = QUALITY_PRESETS[String(ctx.options.quality)] ?? QUALITY_PRESETS.balanced;
  const removeAudio = Boolean(ctx.options.removeAudio);

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stats",
    "-y",
    "-i",
    ctx.inputPath,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    q.preset,
    "-crf",
    q.crf,
    "-pix_fmt",
    "yuv420p",
    // Convert re-encodes audio to AAC for compatibility (rather than copy).
    ...(removeAudio ? ["-an"] : ["-map", "0:a:0?", "-c:a", "aac", "-b:a", "160k"]),
    "-movflags",
    "+faststart",
    ctx.outputPath,
  ];

  return {
    steps: [{ label: "Converting to MP4", args, weight: 1, trackProgress: true }],
    outputPath: ctx.outputPath,
    outputName: ctx.outputName,
    outputKind: "video",
    cleanup: [],
  };
}

function buildTrim(ctx: PlanContext): ProcessPlan {
  const trim = resolveTrim(ctx.options, ctx.durationSec);

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stats",
    "-y",
    ...trim.pre,
    "-i",
    ctx.inputPath,
    ...trim.post,
    // Lossless, fast: copy both streams.
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    ctx.outputPath,
  ];

  return {
    steps: [{ label: "Trimming", args, weight: 1, trackProgress: true }],
    outputPath: ctx.outputPath,
    outputName: ctx.outputName,
    outputKind: "video",
    cleanup: [],
  };
}

const ROTATE_FILTERS: Record<string, string> = {
  "90cw": "transpose=1",
  "90ccw": "transpose=2",
  "180": "transpose=1,transpose=1",
  hflip: "hflip",
  vflip: "vflip",
};

function buildRotate(ctx: PlanContext): ProcessPlan {
  const filter = ROTATE_FILTERS[String(ctx.options.direction)] ?? ROTATE_FILTERS["90cw"];

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stats",
    "-y",
    "-i",
    ctx.inputPath,
    "-vf",
    filter,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    ...audioArgs(Boolean(ctx.options.removeAudio)),
    "-movflags",
    "+faststart",
    ctx.outputPath,
  ];

  return {
    steps: [{ label: "Rotating", args, weight: 1, trackProgress: true }],
    outputPath: ctx.outputPath,
    outputName: ctx.outputName,
    outputKind: "video",
    cleanup: [],
  };
}

function buildGif(ctx: PlanContext): ProcessPlan {
  const fps = Number.parseInt(String(ctx.options.fps ?? "12"), 10) || 12;
  const width = Number.parseInt(String(ctx.options.width ?? "480"), 10) || 480;
  const trim = resolveTrim(ctx.options, ctx.durationSec);
  const palette = `${ctx.tmpPrefix}-palette.png`;
  const scale = `fps=${fps},scale=${width}:-1:flags=lanczos`;

  // Two-pass palette gives far better-looking, smaller GIFs than a naive convert.
  const paletteArgs = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...trim.pre,
    "-i",
    ctx.inputPath,
    ...trim.post,
    "-vf",
    `${scale},palettegen`,
    palette,
  ];

  const gifArgs = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stats",
    "-y",
    ...trim.pre,
    "-i",
    ctx.inputPath,
    ...trim.post,
    "-i",
    palette,
    "-lavfi",
    `${scale}[x];[x][1:v]paletteuse`,
    ctx.outputPath,
  ];

  return {
    steps: [
      { label: "Building colour palette", args: paletteArgs, weight: 1, trackProgress: false },
      { label: "Rendering GIF", args: gifArgs, weight: 1.5, trackProgress: true },
    ],
    outputPath: ctx.outputPath,
    outputName: ctx.outputName,
    outputKind: "image",
    cleanup: [palette],
  };
}

function buildThumbnail(ctx: PlanContext): ProcessPlan {
  const time = parseTimecode(String(ctx.options.time ?? "1"));
  const at = Number.isFinite(time) && time >= 0 ? time : 0;

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    at.toString(),
    "-i",
    ctx.inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    ctx.outputPath,
  ];

  return {
    steps: [{ label: "Extracting frame", args, weight: 1, trackProgress: false }],
    outputPath: ctx.outputPath,
    outputName: ctx.outputName,
    outputKind: "image",
    cleanup: [],
  };
}

const BUILDERS: Record<ToolId, (ctx: PlanContext) => ProcessPlan> = {
  stabilise: buildStabilise,
  compress: buildCompress,
  convert: buildConvert,
  trim: buildTrim,
  rotate: buildRotate,
  gif: buildGif,
  thumbnail: buildThumbnail,
};

export function buildPlan(toolId: ToolId, ctx: PlanContext): ProcessPlan {
  const builder = BUILDERS[toolId];
  if (!builder) throw new Error(`No plan builder for tool "${toolId}".`);
  return builder(ctx);
}
