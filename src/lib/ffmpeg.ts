import { spawn, type ChildProcess } from "node:child_process";
import { config } from "./config";

export interface RunFfmpegOptions {
  /** Total media duration in seconds, used to derive a progress percentage. */
  totalDurationSec?: number;
  /** Called with a 0–1 fraction as encoding progresses. */
  onProgress?: (fraction: number) => void;
  /** Optional AbortSignal to cancel the job. */
  signal?: AbortSignal;
}

export interface FfmpegResult {
  /** Tail of stderr, useful for diagnostics/logging. */
  log: string;
}

// ffmpeg reports progress on stderr as "... time=00:00:12.34 ...".
const TIME_RE = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/;

function parseTimeSeconds(line: string): number | null {
  const m = TIME_RE.exec(line);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * Run a single ffmpeg invocation. Arguments are passed as an argv array and
 * spawned without a shell, so user-derived values can never be interpreted as
 * shell syntax. Always pass `-y` yourself if you want to overwrite.
 */
export function runFfmpeg(
  args: string[],
  options: RunFfmpegOptions = {},
): Promise<FfmpegResult> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(config.ffmpegPath, args, {
      windowsHide: true,
    });

    const logBuffer: string[] = [];
    let killed = false;

    const onAbort = () => {
      killed = true;
      child.kill("SIGKILL");
    };
    if (options.signal) {
      if (options.signal.aborted) onAbort();
      else options.signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      logBuffer.push(text);
      // Keep only the last ~16KB of logs to bound memory.
      if (logBuffer.length > 200) logBuffer.splice(0, logBuffer.length - 200);

      if (options.onProgress && options.totalDurationSec) {
        for (const line of text.split(/[\r\n]+/)) {
          const seconds = parseTimeSeconds(line);
          if (seconds != null) {
            const fraction = Math.min(1, seconds / options.totalDurationSec);
            options.onProgress(fraction);
          }
        }
      }
    });

    child.on("error", (err) => {
      if (options.signal) options.signal.removeEventListener("abort", onAbort);
      reject(new Error(`Failed to launch ffmpeg: ${err.message}`));
    });

    child.on("close", (code) => {
      if (options.signal) options.signal.removeEventListener("abort", onAbort);
      const log = logBuffer.join("");
      if (killed) {
        reject(new Error("Job was cancelled."));
        return;
      }
      if (code !== 0) {
        const tail = log.split(/[\r\n]+/).slice(-12).join("\n");
        reject(new Error(`ffmpeg exited with code ${code}.\n${tail}`));
        return;
      }
      resolve({ log });
    });
  });
}
