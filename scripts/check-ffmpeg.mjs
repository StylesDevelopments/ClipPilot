#!/usr/bin/env node
/**
 * Preflight check: verifies ffmpeg + ffprobe are installed and that the
 * vid.stab filter (needed for the stabilisation tool) is available.
 * Run with: npm run check:ffmpeg
 */
import { spawn } from "node:child_process";

const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

function run(bin, args) {
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(bin, args);
    child.stdout?.on("data", (d) => (out += d));
    child.stderr?.on("data", (d) => (out += d));
    child.on("error", () => resolve({ ok: false, out: "" }));
    child.on("close", (code) => resolve({ ok: code === 0, out }));
  });
}

const ok = (label) => console.log(`  \x1b[32m✓\x1b[0m ${label}`);
const bad = (label) => console.log(`  \x1b[31m✗\x1b[0m ${label}`);

const version = await run(FFMPEG, ["-hide_banner", "-version"]);
const ffprobe = await run(FFPROBE, ["-hide_banner", "-version"]);
const filters = await run(FFMPEG, ["-hide_banner", "-filters"]);

console.log("\nClipPilot — FFmpeg preflight\n");

let failed = false;

if (version.ok) ok(`ffmpeg: ${version.out.split("\n")[0].replace("ffmpeg version ", "")}`);
else {
  bad("ffmpeg not found on PATH");
  failed = true;
}

if (ffprobe.ok) ok("ffprobe found");
else {
  bad("ffprobe not found on PATH");
  failed = true;
}

if (filters.ok && /vidstabdetect/.test(filters.out)) {
  ok("vid.stab filters available (stabilisation enabled)");
} else {
  bad("vid.stab not available — stabilisation will fail");
  console.log(
    "    Install an ffmpeg build with --enable-libvidstab " +
      "(macOS: `brew install ffmpeg`; Ubuntu: `apt install ffmpeg`).",
  );
  failed = true;
}

console.log("");
if (failed) {
  console.log("\x1b[31mSome checks failed. See notes above.\x1b[0m\n");
  process.exit(1);
} else {
  console.log("\x1b[32mAll good — you're ready to run ClipPilot.\x1b[0m\n");
}
