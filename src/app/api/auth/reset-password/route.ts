import { apiUrl, clearToken } from "@/lib/session";

type ResetBody = { token?: string; email?: string; password?: string; password_confirmation?: string };

/** Set a new password with the emailed token. The API signs the account out everywhere, so drop any local session too. */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as ResetBody;

  const response = await fetch(apiUrl("auth/reset-password"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      token: body.token,
      email: body.email,
      password: body.password,
      password_confirmation: body.password_confirmation,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (response.ok) {
    await clearToken();
  }

  return Response.json(payload ?? { message: response.ok ? "" : "Could not reset the password." }, { status: response.status });
}
