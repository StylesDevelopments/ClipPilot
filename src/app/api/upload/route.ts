import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import { nanoid } from "nanoid";
import { requireApiAuth } from "@/lib/api";
import { config } from "@/lib/config";
import { probe } from "@/lib/ffprobe";
import { ensureStorage, getExtension, resolveInScope, sanitizeFilename } from "@/lib/storage";
import { validateUpload } from "@/lib/validation";

export const runtime = "nodejs";
// Uploads can be large; never statically optimise this route.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauthorised = requireApiAuth(req);
  if (unauthorised) return unauthorised;

  try {
    await ensureStorage();

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
    const destination = resolveInScope("uploads", storedName);

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(destination, bytes);

    // Best-effort metadata; never fail the upload because probing failed.
    let info = null;
    try {
      info = await probe(destination);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[clippilot] ffprobe failed for ${storedName}:`, (err as Error).message);
    }

    return NextResponse.json({
      upload: {
        scope: "uploads" as const,
        name: storedName,
        originalName,
        bytes: bytes.length,
      },
      info,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[clippilot] upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ maxUploadMb: config.maxUploadMb });
}
