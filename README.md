# 🎬 ClipPilot

**A quick, local-first video repair toolbox.** Drop in a short clip, smooth out
the wobble, then compress, convert or trim it — all processed on your own
machine. No accounts, no cloud, no uploads to anyone else's servers.

ClipPilot started as a one-trick tool for stabilising shaky iPhone footage and
is built so new media tools slot in with a single file.

```
Upload  →  Choose a tool  →  Process locally  →  Preview & download
```

> **Privacy:** every file is processed on the server running ClipPilot and is
> never shared externally. A built-in "Delete all files" button wipes local
> storage whenever you want.

---

## ✨ Features

| Tool | What it does |
| --- | --- |
| **Stabilise** | Two-pass `vid.stab` motion smoothing for shaky handheld clips. Audio preserved. |
| **Compress** | Re-encode at a smaller bitrate, with optional downscale to 1080/720/480p. |
| **Convert to MP4** | Turn `.mov` / `.m4v` into a universal H.264 + AAC MP4. |
| **Trim** | Fast, lossless cut to just the part you need. |
| **Thumbnail** | Grab a single frame as a JPEG. |

Plus:

- 🖱️ Drag-and-drop upload with live progress
- 📊 Real per-step processing progress (parsed from FFmpeg)
- 🔁 Before/after file sizes with a size-change badge
- ✂️ Optional trim and "remove audio" on the stabilise step
- 🕘 Recent jobs list (stored in your browser only)
- 🧹 One-click cleanup of all local files
- 🔌 A clean REST API you can reuse from other apps (see below)
- ❤️ Health endpoint + preflight script for self-hosters
- 📱 Mobile-responsive and installable (web manifest + touch icon)
- 🐳 One-command Docker deploy with FFmpeg baked in

---

## 🧱 Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **FFmpeg** (with `vid.stab`) driven via Node child processes — no shell, ever
- **Local filesystem** storage — no database, no queue, no auth (by default)

---

## 💾 Storage & architecture

ClipPilot is **self-contained — there is no separate backend or external
storage to set up.** The Next.js app *is* the backend:

- **Server side:** Next.js **API route handlers** (running on Node) accept the
  upload, spawn **FFmpeg** to process it, and serve the result. Job status is
  tracked in a small **in-memory map** while a job runs.
- **Storage:** the **local filesystem** under `STORAGE_DIR` (default
  `./storage`): uploads in `storage/uploads`, results in `storage/outputs`,
  scratch files in `storage/tmp`. No database, no S3, no cloud bucket.
- **Client side:** your browser keeps only a **recent-jobs list in
  `localStorage`** — purely for convenience, never sent anywhere.

So: **just local.** Run `npm run dev` (or `build`/`start`) and everything —
web UI, API and processing — lives in that one process on one machine. Files are
swept automatically after `JOB_TTL_MINUTES`, or instantly via "Delete all files".

When you outgrow a single box, two seams are designed for it: swap the in-memory
store (`src/lib/jobs/store.ts`) for Redis/SQLite, and point `STORAGE_DIR` at a
mounted volume (or adapt `src/lib/storage.ts` to object storage). Nothing else
needs to change.

---

## ✅ Prerequisites

You need **Node.js ≥ 18.18** and **FFmpeg built with `vid.stab`** (the
`vidstabdetect` / `vidstabtransform` filters). Both the macOS Homebrew build and
the standard Ubuntu package include it.

Check your setup at any time:

```bash
npm run check:ffmpeg
```

### macOS setup

```bash
# 1. Install Homebrew if you don't have it: https://brew.sh
# 2. Install FFmpeg (includes vid.stab) and Node
brew install ffmpeg node

# 3. Clone and install
git clone https://github.com/stylesdevelopments/clippilot.git
cd clippilot
npm install

# 4. (Optional) configure
cp .env.example .env.local

# 5. Verify FFmpeg, then run
npm run check:ffmpeg
npm run dev
```

Open <http://localhost:3000>.

### Linux (Debian/Ubuntu)

```bash
sudo apt update && sudo apt install -y ffmpeg
git clone https://github.com/stylesdevelopments/clippilot.git
cd clippilot && npm install && npm run dev
```

---

## ⚙️ Configuration

All settings are optional — ClipPilot runs with zero config. Copy
`.env.example` to `.env.local` to change anything.

| Variable | Default | Description |
| --- | --- | --- |
| `MAX_UPLOAD_MB` | `200` | Maximum upload size in megabytes. |
| `STORAGE_DIR` | `./storage` | Where uploads/outputs are stored. |
| `FFMPEG_PATH` | `ffmpeg` | Path to the ffmpeg binary. |
| `FFPROBE_PATH` | `ffprobe` | Path to the ffprobe binary. |
| `JOB_TTL_MINUTES` | `180` | Auto-delete finished jobs + files after N minutes (`0` disables). |
| `API_TOKEN` | _(empty)_ | If set, mutating API routes require `Authorization: Bearer <token>`. |
| `CORS_ORIGIN` | _(empty)_ | Comma-separated allowed origins, or `*`, for cross-origin API use. |

---

## 📱 Run it from your phone (deployment)

ClipPilot is a web app, so your phone only needs a browser — **but the app
itself must run on a machine that has Node + FFmpeg and a disk to write to.**
That rules out serverless hosts (Vercel/Netlify); use any always-on box instead.

**Easiest: Docker (FFmpeg is baked in).** On any always-on machine — a spare
Mac/PC, a home server, a Raspberry Pi, or a cheap VPS:

```bash
docker compose up -d --build
```

Then on your phone, open `http://<that-machine's-IP>:3000` (e.g.
`http://192.168.1.20:3000` on your home Wi-Fi) and **Add to Home Screen** — the
web manifest + touch icon make it open like a native app.

**Without Docker**, run `npm run build && npm run start` on the host and browse
to its IP from your phone.

**Reaching it from anywhere (not just home Wi-Fi):** put it behind a tunnel or
reverse proxy with HTTPS — e.g. [Tailscale](https://tailscale.com),
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/),
or Caddy/Nginx in front. When exposing it publicly, set `API_TOKEN` and a sane
`MAX_UPLOAD_MB`.

> So no, you don't need your Mac specifically — you need *a* machine that stays
> on. Your Mac is a fine choice; so is a £5/month VPS or a Pi.

---

## 🗂️ Project structure

```
src/
  app/
    page.tsx                  Landing page
    workspace/page.tsx        Upload → tool → process → result (client)
    api/
      upload/route.ts         POST upload, GET limit
      jobs/route.ts           POST create + start a job
      jobs/[id]/route.ts      GET status · PATCH cancel · DELETE files
      files/[scope]/[name]/   GET preview/download (range-aware, path-guarded)
      cleanup/route.ts        POST wipe all local files
      health/route.ts         GET ffmpeg/vid.stab diagnostics
  components/                 Small, focused UI components
  lib/
    config.ts                 Env-driven config
    ffmpeg.ts ffprobe.ts      Safe spawn wrappers (+ progress parsing)
    storage.ts                Paths, sanitising, path-traversal guards
    validation.ts             Upload validation
    api.ts                    Optional bearer-token guard
    client.ts                 Browser-side API client
    jobs/                     Job types, in-memory store, runner
    tools/                    Tool registry (catalog) + ffmpeg plan builders
  middleware.ts               Optional CORS
scripts/check-ffmpeg.mjs      Preflight check
```

---

## 🔧 How stabilisation works

ClipPilot uses FFmpeg's `vid.stab` in two passes, which keeps the original audio
without any extra muxing:

1. **Analyse** — `vidstabdetect` scans the clip and writes a transforms file.
2. **Warp & encode** — `vidstabtransform` smooths the motion, a light `unsharp`
   counteracts softening, and the video is re-encoded with `libx264` while the
   original audio is stream-copied (`-map 0:a:0? -c:a copy`). Clips with no audio
   still export fine.

Strength maps to `shakiness`/`smoothing`; "crop/zoom" maps to `optzoom`/`zoom`;
quality maps to an x264 preset + CRF.

> Prefer OpenCV? The architecture supports it — add a Python script that outputs
> a silent stabilised video, then mux the original audio back with FFmpeg. It's
> not needed here because the distro FFmpeg builds already ship `vid.stab`.

---

## 🔌 Using ClipPilot as an API

The web UI is just a client of a small REST API, so you can call it from your
own apps. Enable `API_TOKEN` (and `CORS_ORIGIN` for browsers) to lock it down.

```bash
# 1) Upload a file
curl -F "file=@shaky.mov" http://localhost:3000/api/upload
# → { "upload": { "name": "ab12….mov", ... }, "info": { "durationSec": 12.3, ... } }

# 2) Start a job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{ "tool": "stabilise", "upload": { "name": "ab12….mov" },
        "options": { "strength": "high", "zoom": "auto", "quality": "balanced" } }'
# → { "job": { "id": "cd34…", "status": "queued", ... } }

# 3) Poll status
curl http://localhost:3000/api/jobs/cd34…
# → { "job": { "status": "done", "progress": 100, "output": { "name": "cd34….mp4" } } }

# 4) Download the result
curl -o out.mp4 "http://localhost:3000/api/files/outputs/cd34….mp4?download=1"
```

With a token set, add `-H "Authorization: Bearer $API_TOKEN"` to the upload, job
and cleanup calls.

---

## ➕ Adding a new tool

The tool system is intentionally tiny to extend:

1. **Describe it** in `src/lib/tools/catalog.ts` — add a `ToolMeta` entry with
   its id, label and option fields. The UI renders the form automatically.
2. **Build its plan** in `src/lib/tools/plan.ts` — add a builder that returns the
   ordered FFmpeg `ProcessStep`s. Register it in the `BUILDERS` map.

That's it — no changes to routes, the runner or the UI required. (Remember to
add the new id to the `ToolId` union in `src/lib/tools/types.ts`.)

---

## 📜 Scripts

```bash
npm run dev            # Start the dev server
npm run build          # Production build
npm run start          # Run the production build
npm run lint           # ESLint
npm run format         # Prettier
npm run test           # Run unit tests (Vitest)
npm run check:ffmpeg   # Verify ffmpeg + vid.stab
```

---

## 🧪 Tests

Unit tests (Vitest) cover the pure, security-sensitive logic — filename
sanitising and path-traversal guards, upload validation, time-code parsing,
size formatting, the tool catalogue, and the FFmpeg plan builders (including a
check that user input is passed as a single argv element and never reaches a
shell):

```bash
npm test
```

---

## 🔒 Safety & robustness

- File **type and size validated** on both client and server.
- Filenames **sanitised**; every served path is **guarded against traversal**.
- Unique **job IDs**; user input is **never** passed through a shell (FFmpeg is
  spawned with an argv array).
- Cancelled/failed jobs clean up partial outputs and temp files.
- Useful errors are logged server-side; the UI shows friendly messages.

---

## 🚧 Known limitations (MVP)

- The job store is **in-memory** (single process). Perfect for local/self-host;
  swap `src/lib/jobs/store.ts` for Redis/SQLite to scale horizontally.
- No authentication by default (enable `API_TOKEN` to add a simple gate).
- `vid.stab` is required for stabilisation; the other tools work without it.

---

## 📄 Licence

MIT — see [`LICENSE`](./LICENSE).
