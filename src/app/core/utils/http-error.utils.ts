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
  const preferred = preferredField ? validationErrorFor(error, preferredField) : null;
  return preferred ?? validationErrors(error).find((item) => item.error)?.error ?? null;
}

/** The message for one field of a 400, or null. Matching ignores case: the API sends `PhoneNumber`. */
export function validationErrorFor(error: HttpErrorResponse, field: string): string | null {
  return validationErrors(error).find((item) => sameField(item.field, field))?.error ?? null;
}

/** The first 400 message that is not `field`, or null. */
export function validationErrorExcept(error: HttpErrorResponse, field: string): string | null {
  return (
    validationErrors(error).find((item) => item.error && !sameField(item.field, field))?.error ??
    null
  );
}

function validationErrors(error: HttpErrorResponse): { field?: string; error?: string }[] {
  if (error.status !== 400) return [];

  const errors = error.error?.errors as { field?: string; error?: string }[] | undefined;
  return Array.isArray(errors) ? errors : [];
}

function sameField(actual: string | undefined, expected: string): boolean {
  return actual?.toLowerCase() === expected.toLowerCase();
}

/**
 * The message the server attached to a refusal, or `fallback`. Errors other than validation come
 * back either as a plain string or as `{ error: string }`.
 */
export function serverErrorMessage(error: HttpErrorResponse, fallback: string): string {
  if (typeof error.error === 'string' && error.error) return error.error;
  if (typeof error.error?.error === 'string' && error.error.error) return error.error.error;
  return fallback;
}

/** What a store keeps of a refused change: plain data, so the action stays serialisable. */
export function toMutationError(error: unknown): WorkItemMutationError {
  return error instanceof HttpErrorResponse
    ? { status: error.status, message: validationMessage(error) }
    : { status: 0, message: null };
}

/** The field the server named in a refused request (400), or null — to show the message under it. */
export function validationField(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return null;

  const errors = error.error?.errors as { field?: string; error?: string }[] | undefined;
  return errors?.find((item) => item.error)?.field ?? null;
}
