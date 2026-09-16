import { apiUrl, setToken } from "@/lib/session";

/** Log in with email or phone and keep the token in an httpOnly cookie. */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { login?: string; password?: string };

  const response = await fetch(apiUrl("auth/login"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ login: body.login, password: body.password, device_name: "property-portal" }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.token) {
    return Response.json(payload ?? { message: "Login failed." }, { status: response.ok ? 500 : response.status });
  }

  await setToken(payload.token);

  return Response.json({ data: payload.data });
}
