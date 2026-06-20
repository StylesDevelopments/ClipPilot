import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { requireApiAuth } from "@/lib/api";
import { config } from "@/lib/config";
import { probe } from "@/lib/ffprobe";
import { getExtension, removeIfExists, sanitizeFilename } from "@/lib/storage";
import { mediaStore } from "@/lib/media";
import { validateUpload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauthorised = requireApiAuth(req);
  if (unauthorised) return unauthorised;

  let tempPath: string | null = null;
  try {
    await mediaStore.init();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const validation = validateUpload({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const ext = getExtension(file.name);
    const storedName = `${nanoid(12)}${ext}`;
    const originalName = sanitizeFilename(file.name);

    // Write to a local temp file first so we can probe metadata before the file
    // is handed to the (possibly remote) media store.
    await mkdir(config.tmpDir, { recursive: true });
    tempPath = path.join(config.tmpDir, `up-${nanoid(8)}${ext}`);
    await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

    let info = null;
    try {
      info = await probe(tempPath);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[clippilot] ffprobe failed for ${storedName}:`, (err as Error).message);
    }

    const bytes = await mediaStore.saveUploadFromPath(storedName, tempPath);
    tempPath = null; // ownership transferred to the media store

    return NextResponse.json({
      upload: { scope: "uploads" as const, name: storedName, originalName, bytes },
      info,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[clippilot] upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  } finally {
    if (tempPath) await removeIfExists(tempPath);
  }
}

export async function GET() {
  return NextResponse.json({ maxUploadMb: config.maxUploadMb });
}
