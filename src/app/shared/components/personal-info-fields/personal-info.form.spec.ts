import { FormControl } from '@angular/forms';
import { birthDateInRange, createPersonalInfoForm, yearsAgo } from './personal-info.form';

describe('birthDateInRange', () => {
  const check = (value: Date | null) => birthDateInRange(new FormControl<Date | null>(value));
  const daysAfter = (date: Date, days: number) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

  // The calendar greys these dates out, but a date typed by hand bypasses it.
  it('accepts the edges of the 18-100 range', () => {
    expect(check(yearsAgo(18))).toBeNull();
    expect(check(yearsAgo(100))).toBeNull();
  });

  it('rejects someone who turns 18 tomorrow', () => {
    expect(check(daysAfter(yearsAgo(18), 1))).toEqual({ tooYoung: true });
  });

  it('rejects a date more than 100 years ago', () => {
    expect(check(daysAfter(yearsAgo(100), -1))).toEqual({ tooOld: true });
  });

  it('leaves an empty value to the required validator', () => {
    expect(check(null)).toBeNull();
  });
});

describe('phone number', () => {
  const phone = () => {
    const form = createPersonalInfoForm();
    return form.controls.phoneNumber;
  };

  it('explains a short Azerbaijan number by the missing digits', () => {
    const control = phone();
    control.setValue('+994 50 123 45');

    expect(control.hasError('phoneLength')).toBe(true);
  });

  it('accepts a full Azerbaijan number', () => {
    const control = phone();
    control.setValue('+994 50 123 45 00');

    expect(control.errors).toBeNull();
  });

  it('checks the shape before the length', () => {
    const control = phone();
    control.setValue('+994 50 123 45 0x');

    expect(control.hasError('pattern')).toBe(true);
    expect(control.hasError('phoneLength')).toBe(false);
  });

  it('keeps the shape check for a number that is not a known country', () => {
    const control = phone();
    control.setValue('0501234567');

    expect(control.hasError('pattern')).toBe(true);
  });
});
