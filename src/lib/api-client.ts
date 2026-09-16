export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: Record<string, string[]> = {},
    public readonly code?: string,
  ) {
    super(message);
  }
}

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
};

function backendUrl(path: string, query: Record<string, QueryValue> = {}): URL {
  const url = new URL(`/api/backend/${path.replace(/^\//, "")}`, window.location.origin);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // A full reload is intended here: it runs outside React and also drops all cached query data.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, payload.message ?? "Something went wrong.", payload.errors ?? {}, payload.code);
  }

  return payload as T;
}

/** Call the Laravel API through the Next.js forwarder, e.g. api("portal/properties", { query: { status: "draft" } }). */
export async function api<T>(path: string, { method = "GET", body, query = {} }: RequestOptions = {}): Promise<T> {
  const response = await fetch(backendUrl(path, query), {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

/** Send multipart form data such as photo uploads; the browser sets the multipart boundary itself. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(backendUrl(path), {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });

  return handleResponse<T>(response);
}

/** "attachment; filename=INV-0001.pdf" → "INV-0001.pdf" (handles the RFC 5987 filename* form too). */
function fileNameFrom(disposition: string | null, fallback: string): string {
  if (!disposition) {
    return fallback;
  }

  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);

  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the plain filename.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(disposition);

  return plain ? plain[1].trim() : fallback;
}

/**
 * Download a file (PDF, CSV) through the forwarder and save it in the browser.
 * API errors such as FEATURE_NOT_IN_PLAN are thrown as ApiError, like api().
 */
export async function apiDownload(path: string, { query = {}, fileName }: { query?: Record<string, QueryValue>; fileName: string }): Promise<void> {
  const response = await fetch(backendUrl(path, query), { headers: { Accept: "application/json, application/pdf, text/csv, */*" } });

  if (!response.ok || response.status === 204) {
    await handleResponse(response);

    throw new ApiError(response.status, "The file could not be downloaded.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileNameFrom(response.headers.get("content-disposition"), fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the file.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
