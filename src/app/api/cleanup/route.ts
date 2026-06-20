import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api";
import { mediaStore } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete every uploaded and processed file from local storage. This is a
 * deliberate, user-initiated "wipe everything" action exposed by the UI.
 */
export async function POST(req: NextRequest) {
  const unauthorised = requireApiAuth(req);
  if (unauthorised) return unauthorised;

  try {
    const removed = await mediaStore.purgeAll();
    return NextResponse.json({ removed });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[clippilot] cleanup failed:", err);
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
