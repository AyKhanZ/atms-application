import { formatDateInput, parseDisplayDate } from './date-input.utils';

describe('date input utilities', () => {
  it.each([
    ['1', '1'],
    ['1212', '12.12'],
    ['12/12/2000', '12.12.2000'],
    ['12122000123', '12.12.2000'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatDateInput(value)).toBe(expected);
  });

  it.each([
    ['12.12.2000', true],
    ['31.02.2026', false],
    ['12.12.20', false],
  ])('validates %s', (value, expectedValid) => {
    expect(parseDisplayDate(value) instanceof Date).toBe(expectedValid);
  });
});
