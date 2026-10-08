import { FormControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { hasWrongAzerbaijanLength, showPhoneServerError } from './phone-number.utils';

describe('hasWrongAzerbaijanLength', () => {
  it('refuses a short Azerbaijan number', () => {
    expect(hasWrongAzerbaijanLength('+994 50 123 45')).toBe(true);
    expect(hasWrongAzerbaijanLength('+9945012345')).toBe(true);
  });

  it('refuses a too long Azerbaijan number', () => {
    expect(hasWrongAzerbaijanLength('+994 50 123 45 001')).toBe(true);
  });

  it('accepts a full Azerbaijan number, spaces included', () => {
    expect(hasWrongAzerbaijanLength('+994 50 123 45 00')).toBe(false);
    expect(hasWrongAzerbaijanLength('+994501234567')).toBe(false);
  });

  it('leaves other countries alone', () => {
    expect(hasWrongAzerbaijanLength('+1 202 555 0143')).toBe(false);
    expect(hasWrongAzerbaijanLength('+90 532 111 22 33')).toBe(false);
  });

  it('leaves an empty value to the required check', () => {
    expect(hasWrongAzerbaijanLength('')).toBe(false);
    expect(hasWrongAzerbaijanLength('   ')).toBe(false);
  });
});

describe('showPhoneServerError', () => {
  const refusal = (errors: { field: string; error: string }[]) =>
    new HttpErrorResponse({ status: 400, error: { errors } });

  it('puts a PhoneNumber refusal on the control and leaves no toast', () => {
    const control = new FormControl('+994 00 000 00 00');
    const toast = vi.fn();

    const shown = showPhoneServerError(
      control,
      refusal([{ field: 'PhoneNumber', error: 'Enter a valid international phone number.' }]),
      toast,
    );

    expect(shown).toBe(true);
    expect(control.getError('server')).toBe('Enter a valid international phone number.');
    expect(control.touched).toBe(true);
    expect(toast).not.toHaveBeenCalled();
  });

  it('sends another refused field to the toast next to the phone', () => {
    const control = new FormControl('+994 00 000 00 00');
    const toast = vi.fn();

    showPhoneServerError(
      control,
      refusal([
        { field: 'PhoneNumber', error: 'Enter a valid international phone number.' },
        { field: 'Name', error: 'Name is required.' },
      ]),
      toast,
    );

    expect(toast).toHaveBeenCalledWith('Name is required.');
  });

  it('leaves an error without a phone refusal to the caller', () => {
    const control = new FormControl('');
    const toast = vi.fn();

    const shown = showPhoneServerError(
      control,
      refusal([{ field: 'Name', error: 'Name is required.' }]),
      toast,
    );

    expect(shown).toBe(false);
    expect(control.errors).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });
});
