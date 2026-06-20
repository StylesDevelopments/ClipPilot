import { NextResponse, type NextRequest } from "next/server";
import { config } from "./config";

/**
 * Guard for mutating API routes. Returns a 401 response if a token is
 * configured and the request does not present it; otherwise returns null and
 * the caller proceeds. When no token is configured the API is open (MVP
 * default), so this is a no-op until you opt in via the API_TOKEN env var.
 */
export function requireApiAuth(req: NextRequest): NextResponse | null {
  if (!config.apiToken) return null;

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (token !== config.apiToken) {
    return NextResponse.json(
      { error: "Unauthorised. Provide a valid API token." },
      { status: 401 },
    );
  }
  return null;
}
