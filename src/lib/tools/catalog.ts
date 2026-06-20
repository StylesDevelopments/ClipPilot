import type { ToolMeta } from "./types";

/**
 * The single source of truth for which tools exist and what options they
 * expose. Both the UI (to render forms) and the server (to validate + build
 * ffmpeg plans) read from this list. Add a tool here + a builder in plan.ts
 * and it appears everywhere.
 */
export const TOOLS: ToolMeta[] = [
  {
    id: "stabilise",
    label: "Stabilise",
    tagline: "Smooth out shaky handheld footage",
    description:
      "Two-pass motion analysis and warping for wobbly iPhone clips. Original audio is preserved.",
    outputKind: "video",
    outputExt: "mp4",
    fields: [
      {
        key: "strength",
        label: "Stabilisation strength",
        type: "select",
        default: "medium",
        choices: [
          { value: "low", label: "Low – subtle" },
          { value: "medium", label: "Medium – recommended" },
          { value: "high", label: "High – very shaky" },
        ],
        help: "Higher strength smooths more but may crop or warp more.",
      },
      {
        key: "zoom",
        label: "Crop / zoom",
        type: "select",
        default: "auto",
        choices: [
          { value: "auto", label: "Auto" },
          { value: "1.05", label: "1.05×" },
          { value: "1.10", label: "1.10×" },
          { value: "1.15", label: "1.15×" },
        ],
        help: "Zooms in slightly to hide the empty edges created by stabilising.",
      },
      {
        key: "quality",
        label: "Output quality",
        type: "select",
        default: "balanced",
        choices: [
          { value: "fast", label: "Fast – quicker, larger" },
          { value: "balanced", label: "Balanced" },
          { value: "high", label: "High – slower, smaller" },
        ],
      },
      {
        key: "trimStart",
        label: "Trim from (optional)",
        type: "text",
        default: "",
        placeholder: "e.g. 0:03",
        help: "Leave blank to start at the beginning.",
      },
      {
        key: "trimEnd",
        label: "Trim to (optional)",
        type: "text",
        default: "",
        placeholder: "e.g. 0:12",
      },
      {
        key: "removeAudio",
        label: "Remove audio",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "compress",
    label: "Compress",
    tagline: "Shrink file size for sharing",
    description: "Re-encode with a smaller bitrate and optional downscale.",
    outputKind: "video",
    outputExt: "mp4",
    fields: [
      {
        key: "level",
        label: "Compression level",
        type: "select",
        default: "medium",
        choices: [
          { value: "light", label: "Light – best quality" },
          { value: "medium", label: "Medium – balanced" },
          { value: "strong", label: "Strong – smallest" },
        ],
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "select",
        default: "keep",
        choices: [
          { value: "keep", label: "Keep original" },
          { value: "1080", label: "1080p" },
          { value: "720", label: "720p" },
          { value: "480", label: "480p" },
        ],
      },
      {
        key: "removeAudio",
        label: "Remove audio",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "convert",
    label: "Convert to MP4",
    tagline: "Turn MOV / M4V into a universal MP4",
    description: "Re-encode to H.264 + AAC in an MP4 container for maximum compatibility.",
    outputKind: "video",
    outputExt: "mp4",
    fields: [
      {
        key: "quality",
        label: "Quality",
        type: "select",
        default: "balanced",
        choices: [
          { value: "fast", label: "Fast" },
          { value: "balanced", label: "Balanced" },
          { value: "high", label: "High" },
        ],
      },
      {
        key: "removeAudio",
        label: "Remove audio",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "trim",
    label: "Trim",
    tagline: "Cut to just the part you need",
    description: "Fast, lossless trim using stream copy (no re-encode).",
    outputKind: "video",
    outputExt: "mp4",
    fields: [
      {
        key: "trimStart",
        label: "Start",
        type: "text",
        default: "0",
        placeholder: "e.g. 0:03",
      },
      {
        key: "trimEnd",
        label: "End",
        type: "text",
        default: "",
        placeholder: "e.g. 0:12 (blank = end)",
      },
    ],
  },
  {
    id: "rotate",
    label: "Rotate",
    tagline: "Fix sideways or upside-down footage",
    description: "Rotate or flip the video and re-encode. Original audio is kept.",
    outputKind: "video",
    outputExt: "mp4",
    fields: [
      {
        key: "direction",
        label: "Direction",
        type: "select",
        default: "90cw",
        choices: [
          { value: "90cw", label: "90° clockwise" },
          { value: "90ccw", label: "90° anticlockwise" },
          { value: "180", label: "180°" },
          { value: "hflip", label: "Flip horizontally" },
          { value: "vflip", label: "Flip vertically" },
        ],
      },
      {
        key: "removeAudio",
        label: "Remove audio",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "gif",
    label: "GIF",
    tagline: "Make a shareable animated GIF",
    description:
      "Convert a clip (or a trimmed section) into an optimised GIF using a generated colour palette.",
    outputKind: "image",
    outputExt: "gif",
    fields: [
      {
        key: "fps",
        label: "Frame rate",
        type: "select",
        default: "12",
        choices: [
          { value: "8", label: "8 fps – smallest" },
          { value: "12", label: "12 fps" },
          { value: "15", label: "15 fps – smoothest" },
        ],
      },
      {
        key: "width",
        label: "Width",
        type: "select",
        default: "480",
        choices: [
          { value: "320", label: "320px" },
          { value: "480", label: "480px" },
          { value: "640", label: "640px" },
        ],
      },
      {
        key: "trimStart",
        label: "From (optional)",
        type: "text",
        default: "",
        placeholder: "e.g. 0:02",
      },
      {
        key: "trimEnd",
        label: "To (optional)",
        type: "text",
        default: "",
        placeholder: "e.g. 0:06",
        help: "GIFs are best kept short.",
      },
    ],
  },
  {
    id: "thumbnail",
    label: "Thumbnail",
    tagline: "Grab a single frame as an image",
    description: "Extract one frame as a JPEG, handy for cover images.",
    outputKind: "image",
    outputExt: "jpg",
    fields: [
      {
        key: "time",
        label: "Timestamp",
        type: "text",
        default: "1",
        placeholder: "e.g. 0:02",
        help: "Where in the clip to grab the frame.",
      },
    ],
  },
];

export function getTool(id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.id === id);
}

/** Merge user-supplied options over the tool defaults. */
export function withDefaults(
  tool: ToolMeta,
  options: Record<string, unknown> = {},
): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (const field of tool.fields) {
    const supplied = options[field.key];
    if (field.type === "toggle") {
      result[field.key] =
        typeof supplied === "boolean" ? supplied : Boolean(field.default);
    } else {
      result[field.key] =
        typeof supplied === "string" ? supplied : String(field.default);
    }
  }
  return result;
}
