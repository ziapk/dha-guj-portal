import { apiUrl, setToken } from "@/lib/session";

type RegisterBody = {
  name?: string;
  account_type?: string;
  email?: string;
  phone?: string;
  password?: string;
  password_confirmation?: string;
};

/** Create an account and log the user straight in. */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as RegisterBody;

  const response = await fetch(apiUrl("auth/register"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      name: body.name,
      account_type: body.account_type,
      email: body.email || null,
      phone: body.phone || null,
      password: body.password,
      password_confirmation: body.password_confirmation,
      device_name: "property-portal",
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.token) {
    return Response.json(payload ?? { message: "Registration failed." }, { status: response.ok ? 500 : response.status });
  }

  await setToken(payload.token);

  return Response.json({ data: payload.data }, { status: 201 });
}
