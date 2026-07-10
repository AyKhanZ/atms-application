import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

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
