import type { NextRequest } from "next/server";
import { apiUrl, clearToken, getToken } from "@/lib/session";

/** Only these API areas are reachable from the Property Portal. */
const ALLOWED_PATHS = [/^portal\/.+/, /^public\/.+/, /^auth\/me$/];

/** Fully decode a path segment (it may arrive encoded once or twice); null when it is malformed. */
function safeDecode(segment: string): string | null {
  try {
    let decoded = segment;

    for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(decoded); i++) {
      decoded = decodeURIComponent(decoded);
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Forward browser requests to the Laravel API with the token from the httpOnly cookie.
 * /api/backend/portal/properties?status=draft → {API_URL}/api/v1/portal/properties?status=draft
 */
async function forward(request: NextRequest, ctx: RouteContext<"/api/backend/[...path]">): Promise<Response> {
  const token = await getToken();

  if (!token) {
    return Response.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const { path } = await ctx.params;
  const segments = path.map(safeDecode);

  // Refuse dot segments in any encoding so a request can never climb out of /api/v1.
  if (segments.some((segment) => segment === null || segment === "." || segment === "..")) {
    return Response.json({ message: "Invalid path." }, { status: 400 });
  }

  const cleanSegments = segments as string[];

  if (!ALLOWED_PATHS.some((pattern) => pattern.test(cleanSegments.join("/")))) {
    return Response.json({ message: "Not found." }, { status: 404 });
  }

  const target = apiUrl(cleanSegments.map(encodeURIComponent).join("/"));
  target.search = request.nextUrl.search;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const contentType = request.headers.get("content-type");

  const response = await fetch(target, {
    method: request.method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      // Keep the original content type so multipart photo uploads keep their boundary.
      ...(hasBody && contentType ? { "Content-Type": contentType } : {}),
    },
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  if (response.status === 401) {
    await clearToken();
  }

  const headers = new Headers({ "Content-Type": response.headers.get("content-type") ?? "application/json" });
  const disposition = response.headers.get("content-disposition");

  // Keep the file name of downloads such as invoice PDFs and CSV exports.
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }

  // Pass the body through as bytes so binary files (PDF, images) are not corrupted by text decoding.
  return new Response(response.status === 204 ? null : await response.arrayBuffer(), { status: response.status, headers });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
