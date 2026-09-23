import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE } from "@/lib/constants";

const GUEST_PAGES = ["/login", "/register"];

/**
 * Reachable with or without a session: password reset and agent invitation links from emails,
 * and the admin "login as user" link, which must be able to replace an existing session.
 */
const PUBLIC_PAGES = ["/forgot-password", "/reset-password", "/impersonate", "/accept-invite"];

/**
 * Optimistic auth redirect based only on the cookie being present.
 * The Laravel API still checks the token on every request.
 */
export function proxy(request: NextRequest) {
  if (PUBLIC_PAGES.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has(TOKEN_COOKIE);
  const isGuestPage = GUEST_PAGES.includes(request.nextUrl.pathname);

  if (!hasToken && !isGuestPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasToken && isGuestPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // robots.txt is excluded so crawlers get the "Disallow: /" file instead of a redirect to /login.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
