/** Name of the httpOnly cookie that holds the Laravel user token. */
export const TOKEN_COOKIE = "portal_token";

/** Public Web base URL for "View on website" links, e.g. https://dhaguj.com. */
export const PUBLIC_WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3002").replace(/\/$/, "");
