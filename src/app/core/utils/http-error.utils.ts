import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { WorkItemMutationError } from '../models/work-items';

export const API_TIMEOUT_MS = 10_000;

export function isServerUnavailable(error: unknown): boolean {
  if (error instanceof TimeoutError) {
    return true;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  return error.status === 0 || error.status === 503 || error.status === 504;
}

export function isTerminalRefreshError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
}

/**
 * The message the server gave for a request it refused as invalid (400), or null. The API sends
 * validation failures as `{ errors: [{ field, error }] }`. With `preferredField`, that field's
 * message wins — the one the user can fix in front of them — and any other is the fallback.
 */
export function validationMessage(
  error: HttpErrorResponse,
  preferredField?: string,
): string | null {
  if (error.status !== 400) return null;

  const errors = error.error?.errors as { field?: string; error?: string }[] | undefined;
  const preferred = preferredField
    ? errors?.find((item) => item.field?.toLowerCase() === preferredField.toLowerCase())?.error
    : undefined;
  return preferred ?? errors?.find((item) => item.error)?.error ?? null;
}

/** What a store keeps of a refused change: plain data, so the action stays serialisable. */
export function toMutationError(error: unknown): WorkItemMutationError {
  return error instanceof HttpErrorResponse
    ? { status: error.status, message: validationMessage(error) }
    : { status: 0, message: null };
}
