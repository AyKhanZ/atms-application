import { FormControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  azerbaijanDigits,
  formatPhoneDigits,
  phoneFieldValue,
  showPhoneServerError,
  storedPhone,
} from './phone-number.utils';

describe('azerbaijanDigits', () => {
  it.each([
    '+994 50 353 78 88',
    '+994503537888',
    '994503537888',
    '00994 50 353 78 88',
    '050 353 78 88',
    '(050) 353-78-88',
    '503537888',
  ])('takes the 9 digits after +994 from %s', (raw) => {
    expect(azerbaijanDigits(raw)).toBe('503537888');
  });

  // 99 is a real operator code, the 994 here is not a country code
  it('keeps a 9-digit number that starts with 994', () => {
    expect(azerbaijanDigits('99 450 35 37')).toBe('994503537');
  });

  it('is empty for nothing or only zeros', () => {
    expect(azerbaijanDigits('')).toBe('');
    expect(azerbaijanDigits(null)).toBe('');
    expect(azerbaijanDigits('000')).toBe('');
  });
});

describe('formatPhoneDigits', () => {
  it('groups the digits as 50 353 78 88 while they are typed', () => {
    expect(formatPhoneDigits('5')).toBe('5');
    expect(formatPhoneDigits('503')).toBe('50 3');
    expect(formatPhoneDigits('5035378')).toBe('50 353 78');
    expect(formatPhoneDigits('503537888')).toBe('50 353 78 88');
  });
});

describe('phoneFieldValue and storedPhone', () => {
  it('shows a stored number without +994 and stores it back with it', () => {
    expect(phoneFieldValue('+994503537888')).toBe('50 353 78 88');
    expect(storedPhone('50 353 78 88')).toBe('+994503537888');
  });

  it('starts empty for a number of another country', () => {
    expect(phoneFieldValue('+447911123456')).toBe('');
    expect(phoneFieldValue(null)).toBe('');
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
