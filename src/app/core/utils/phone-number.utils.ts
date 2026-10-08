import { AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorExcept, validationErrorFor } from './http-error.utils';

// azerbaijan number has 9 digits after the code, other countries are left to the server
export function hasWrongAzerbaijanLength(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('994') && digits.length !== 12;
}

// false = phone wasnt refused, caller shows the error its usual way
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
