import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/constants";

/** Secure cookies need HTTPS. SESSION_COOKIE_SECURE=false allows a production build to run over plain http locally. */
const secureCookie = () => (process.env.SESSION_COOKIE_SECURE ? process.env.SESSION_COOKIE_SECURE === "true" : process.env.NODE_ENV === "production");

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const cookieDomain = () => process.env.SESSION_COOKIE_DOMAIN || undefined;

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

/** Store the token in the httpOnly cookie; maxAgeSeconds defaults to 7 days (impersonation sessions pass 30 minutes). */
export async function setToken(token: string, maxAgeSeconds: number = TOKEN_MAX_AGE_SECONDS): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    maxAge: maxAgeSeconds,
  });
}

export async function clearToken(): Promise<void> {
  (await cookies()).delete({ name: TOKEN_COOKIE, path: "/", domain: cookieDomain() });
}

/** Build a URL for the Laravel API, e.g. apiUrl("portal/properties") → {API_URL}/api/v1/portal/properties. */
export function apiUrl(path: string): URL {
  const base = process.env.API_URL;

  if (!base) {
    throw new Error("API_URL is not set. Add it to .env.local.");
  }

  return new URL(`${base.replace(/\/$/, "")}/api/v1/${path.replace(/^\//, "")}`);
}

/** Keep only what the browser needs from a Laravel error reply (never debug details such as stack traces). */
export function publicError(payload: unknown, fallback: string): { message: string; errors?: Record<string, string[]>; code?: string } {
  const body = (payload ?? {}) as { message?: unknown; errors?: unknown; code?: unknown };

  return {
    message: typeof body.message === "string" && body.message ? body.message : fallback,
    ...(body.errors && typeof body.errors === "object" ? { errors: body.errors as Record<string, string[]> } : {}),
    ...(typeof body.code === "string" ? { code: body.code } : {}),
  };
}
