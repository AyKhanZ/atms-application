import { IsOverduePipe } from './deadline.pipe';

describe('IsOverduePipe', () => {
  const pipe = new IsOverduePipe();

  it.each([
    ['2020-01-01T00:00:00Z', false, true],
    ['2020-01-01T00:00:00Z', true, false],
    ['2099-01-01T00:00:00Z', false, false],
    [null, false, false],
  ])('deadline %s, closed=%s is overdue: %s', (deadline, closed, expected) => {
    expect(pipe.transform(deadline, closed)).toBe(expected);
  });
});
