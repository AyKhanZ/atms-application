import { AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorExcept, validationErrorFor } from './http-error.utils';

/**
 * `+994 50 123 45` has too few digits, `+994 50 123 45 001` too many: an Azerbaijan number has 9 after
 * the code. Other countries are left to the shape check and the server.
 */
export function hasWrongAzerbaijanLength(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('994') && digits.length !== 12;
}

/**
 * A PhoneNumber refusal goes under the field, and any other refused field to `toast`. Returns false
 * when the phone was not refused: the caller reports the error its usual way.
 */
export function showPhoneServerError(
  control: AbstractControl,
  error: HttpErrorResponse,
  toast: (message: string) => void,
): boolean {
  const phoneError = validationErrorFor(error, 'PhoneNumber');
  if (!phoneError) return false;

  control.setErrors({ server: phoneError });
  control.markAsTouched();

  const otherError = validationErrorExcept(error, 'PhoneNumber');
  if (otherError) toast(otherError);
  return true;
}
