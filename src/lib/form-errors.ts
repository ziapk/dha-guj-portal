import type { FormInstance } from "antd";
import { ApiError } from "@/lib/api-client";

/**
 * Show Laravel 422 errors under the matching Ant Design form fields.
 * "items.0.quota_item_id" becomes the field path ["items", 0, "quota_item_id"].
 * Returns false when the error is not a validation error, so callers can show a toast instead.
 */
export function applyFormErrors(form: FormInstance, error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 422 || Object.keys(error.errors).length === 0) {
    return false;
  }

  form.setFields(
    Object.entries(error.errors).map(([field, messages]) => ({
      name: field.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part)),
      errors: messages,
    })),
  );

  return true;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
