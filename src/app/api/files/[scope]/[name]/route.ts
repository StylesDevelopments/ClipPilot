import { NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getExtension, sanitizeFilename } from "@/lib/storage";
import { mediaStore, type StorageScope } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

interface Params {
  params: { scope: string; name: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const scope = params.scope;
  if (scope !== "uploads" && scope !== "outputs") {
    return new Response("Not found", { status: 404 });
  }

  const name = sanitizeFilename(params.name);
  const download = req.nextUrl.searchParams.get("download") === "1";

  let plan;
  try {
    plan = await mediaStore.serve(scope as StorageScope, name, download);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  // Supabase backend: hand off to a signed URL (supports range via the CDN).
  if (plan.redirectUrl) {
    return Response.redirect(plan.redirectUrl, 302);
  }

  // Local backend: stream from disk with range support.
  const filePath = plan.localPath!;
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const total = fileStat.size;
  const contentType = CONTENT_TYPES[getExtension(name)] ?? "application/octet-stream";
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  };
  if (download) {
    baseHeaders["Content-Disposition"] = `attachment; filename="${name}"`;
  }

  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match[2] ? Number.parseInt(match[2], 10) : total - 1;
      if (start >= total || end >= total || start > end) {
        return new Response("Range not satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${total}` },
        });
      }
      const nodeStream = createReadStream(filePath, { start, end });
      return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
  }

  const nodeStream = createReadStream(filePath);
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(total) },
  });
}
