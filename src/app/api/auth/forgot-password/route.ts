import { apiUrl } from "@/lib/session";

/** Ask the API to email a password reset link. Works without a login; the reply is the same whether or not the email exists. */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { email?: string };

  const response = await fetch(apiUrl("auth/forgot-password"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  return Response.json(payload ?? { message: response.ok ? "" : "Could not send the reset link." }, { status: response.status });
}
