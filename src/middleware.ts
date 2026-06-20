import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional CORS for using ClipPilot as a headless API from another origin.
 * Controlled entirely by the CORS_ORIGIN env var:
 *   - unset/empty  -> no CORS headers (same-origin only; the MVP default)
 *   - "*"          -> allow any origin
 *   - "a,b,c"      -> allow listed origins
 *
 * Reading env here (rather than importing config) keeps the middleware bundle
 * light and edge-compatible.
 */
const allowList = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function resolveOrigin(requestOrigin: string | null): string | null {
  if (allowList.length === 0) return null;
  if (allowList.includes("*")) return "*";
  if (requestOrigin && allowList.includes(requestOrigin)) return requestOrigin;
  return null;
}

export function middleware(req: NextRequest) {
  const allowOrigin = resolveOrigin(req.headers.get("origin"));

  // Preflight.
  if (req.method === "OPTIONS" && allowOrigin) {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(allowOrigin),
    });
  }

  const res = NextResponse.next();
  if (allowOrigin) {
    for (const [key, value] of Object.entries(corsHeaders(allowOrigin))) {
      res.headers.set(key, value);
    }
  }
  return res;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const config = {
  matcher: "/api/:path*",
};
