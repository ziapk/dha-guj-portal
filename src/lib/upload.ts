import { ApiError, apiUpload } from "@/lib/api-client";

/** Send multipart form data (file uploads) through the forwarder; errors carry Laravel's field errors. */
export function uploadForm<T>(path: string, body: FormData): Promise<T> {
  return apiUpload<T>(path, body);
}

/** First Laravel error for a field (e.g. "image"), falling back to the error message. */
export function uploadErrorMessage(error: unknown, field: string): string {
  if (error instanceof ApiError) {
    return error.errors[field]?.[0] ?? error.message;
  }

  return error instanceof Error ? error.message : "The upload failed.";
}
