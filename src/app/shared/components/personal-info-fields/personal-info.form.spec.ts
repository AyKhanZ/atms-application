import { FormControl } from '@angular/forms';
import { birthDateInRange, yearsAgo } from './personal-info.form';

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
