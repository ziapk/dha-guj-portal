import { apiUrl, publicError, setToken } from "@/lib/session";

/** Impersonation tokens expire after 30 minutes on the API; the cookie goes with them. */
const IMPERSONATION_MAX_AGE_SECONDS = 30 * 60;

/**
 * Swap the one-time code from the Admin Portal's "login as user" link for a user token.
 * Replaces any session already in the cookie.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!code) {
    return Response.json({ message: "This login link is incomplete. Start again from the Admin Portal." }, { status: 422 });
  }

  const response = await fetch(apiUrl("auth/impersonate"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 422) {
    // Wrong length, unknown, used or expired: the admin needs a fresh link either way.
    return Response.json({ message: "This login link has expired or was already used. Start again from the Admin Portal." }, { status: 422 });
  }

  if (!response.ok || !payload?.token) {
    return Response.json(publicError(payload, "Could not start the session."), { status: response.ok ? 500 : response.status });
  }

  const expiresAt = Date.parse(payload.impersonation?.expires_at ?? "");
  const secondsLeft = Number.isNaN(expiresAt) ? IMPERSONATION_MAX_AGE_SECONDS : Math.floor((expiresAt - Date.now()) / 1000);

  await setToken(payload.token, Math.max(60, Math.min(IMPERSONATION_MAX_AGE_SECONDS, secondsLeft)));

  return Response.json({ data: payload.data, impersonation: payload.impersonation ?? null });
}
