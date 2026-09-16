import type { NextRequest } from "next/server";
import { apiUrl, publicError, setToken } from "@/lib/session";

type AcceptBody = { token?: unknown; name?: unknown; phone?: unknown; password?: unknown; password_confirmation?: unknown };

/** Invitation tokens are 48 random letters and digits; anything else never reaches the API. */
function invitationPath(token: unknown, suffix = ""): string | null {
  return typeof token === "string" && /^[A-Za-z0-9]{16,128}$/.test(token) ? `auth/agent-invitations/${token}${suffix}` : null;
}

const invalid = () => Response.json({ message: "This invitation link is not valid. Ask the agency for a new one." }, { status: 404 });

/** Load an agent invitation for the accept page (no login needed). */
export async function GET(request: NextRequest): Promise<Response> {
  const path = invitationPath(request.nextUrl.searchParams.get("token"));

  if (!path) {
    return invalid();
  }

  const response = await fetch(apiUrl(path), { headers: { Accept: "application/json" }, cache: "no-store" });
  const payload = await response.json().catch(() => null);

  return response.ok
    ? Response.json({ data: payload?.data }, { status: response.status })
    : Response.json(publicError(payload, "Could not load the invitation."), { status: response.status });
}

/** Accept the invitation: the API creates the agent account and returns a token, which is kept in the session cookie. */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as AcceptBody;
  const path = invitationPath(body.token, "/accept");

  if (!path) {
    return invalid();
  }

  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      name: body.name,
      phone: body.phone || null,
      password: body.password,
      password_confirmation: body.password_confirmation,
      device_name: "property-portal",
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.token) {
    return Response.json(publicError(payload, "Could not create your account."), { status: response.ok ? 500 : response.status });
  }

  await setToken(payload.token);

  return Response.json({ data: payload.data }, { status: 201 });
}
