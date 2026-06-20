import { spawn } from "node:child_process";
import { config } from "./config";

export interface MediaInfo {
  durationSec: number;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: string };
}

/**
 * Inspect a media file with ffprobe. Arguments are passed as an argv array
 * (never through a shell), so the file path is safe even with odd characters.
 */
export function probe(filePath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ];

    const child = spawn(config.ffprobePath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) =>
      reject(new Error(`Failed to launch ffprobe: ${err.message}`)),
    );

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        const json = JSON.parse(stdout) as FfprobeOutput;
        const streams = json.streams ?? [];
        const video = streams.find((s) => s.codec_type === "video");
        const audio = streams.find((s) => s.codec_type === "audio");
        const duration =
          Number.parseFloat(json.format?.duration ?? "") ||
          Number.parseFloat(video?.duration ?? "") ||
          0;

        resolve({
          durationSec: Number.isFinite(duration) ? duration : 0,
          width: video?.width ?? null,
          height: video?.height ?? null,
          hasAudio: Boolean(audio),
          videoCodec: video?.codec_name ?? null,
          audioCodec: audio?.codec_name ?? null,
        });
      } catch (err) {
        reject(new Error(`Could not parse ffprobe output: ${(err as Error).message}`));
      }
    });
  });
}
