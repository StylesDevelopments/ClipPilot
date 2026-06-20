import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function run(bin: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(bin, args, { windowsHide: true });
    child.stdout?.on("data", (d) => (out += d.toString()));
    child.stderr?.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve({ ok: false, out: "" }));
    child.on("close", (code) => resolve({ ok: code === 0, out }));
  });
}

/**
 * Diagnostics for self-hosters: confirms ffmpeg/ffprobe are reachable and that
 * the vid.stab filter (required for stabilisation) is compiled in.
 */
export async function GET() {
  const [version, filters, ffprobe] = await Promise.all([
    run(config.ffmpegPath, ["-hide_banner", "-version"]),
    run(config.ffmpegPath, ["-hide_banner", "-filters"]),
    run(config.ffprobePath, ["-hide_banner", "-version"]),
  ]);

  const ffmpegVersion = version.ok
    ? (version.out.split(/\r?\n/)[0] ?? "").replace("ffmpeg version ", "").trim()
    : null;
  const vidstab = filters.ok && /vidstabdetect/.test(filters.out);

  return NextResponse.json({
    ok: version.ok && ffprobe.ok,
    ffmpeg: { available: version.ok, version: ffmpegVersion },
    ffprobe: { available: ffprobe.ok },
    stabilisation: {
      available: vidstab,
      note: vidstab
        ? "vid.stab filters detected."
        : "vid.stab not found — rebuild ffmpeg with --enable-libvidstab to enable stabilisation.",
    },
    backends: {
      storage: config.storageBackend,
      jobs: config.jobsBackend,
      supabaseConfigured: config.supabaseReady,
    },
    limits: { maxUploadMb: config.maxUploadMb },
  });
}
