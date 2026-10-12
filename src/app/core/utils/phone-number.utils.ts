import { AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorExcept, validationErrorFor } from './http-error.utils';

// the field holds what follows +994; a pasted or autofilled +994…, 00994… or 0… comes down to 9 digits
export function azerbaijanDigits(raw: string | null | undefined): string {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00994')) digits = digits.slice(5);
  else if (digits.startsWith('994') && digits.length > 9) digits = digits.slice(3);
  return digits.replace(/^0+/, '').slice(0, 9);
}

// 50 353 78 88, the way the number is written here
export function formatPhoneDigits(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter((group) => group.length > 0)
    .join(' ');
}

// a number of another country does not fit the +994 field, so it starts empty
export function phoneFieldValue(stored: string | null | undefined): string {
  const value = (stored ?? '').trim();
  if (value.startsWith('+') && !value.startsWith('+994')) return '';
  return formatPhoneDigits(azerbaijanDigits(value));
}

export function storedPhone(fieldValue: string): string {
  return `+994${fieldValue.replace(/\D/g, '')}`;
}

export function phoneDigitCount(fieldValue: string | null | undefined): number {
  return (fieldValue ?? '').replace(/\D/g, '').length;
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
