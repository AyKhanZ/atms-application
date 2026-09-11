import { workItemProgressBadge } from './work-item-progress.utils';

describe('workItemProgressBadge', () => {
  it.each([
    [undefined, undefined, undefined],
    [0, 0, undefined],
    [0, 5, '0/5'],
    [undefined, 5, '0/5'],
    [3, 5, '3/5'],
    [5, 5, '5/5'],
  ])('formats done=%s total=%s as %s', (done, total, expected) => {
    expect(workItemProgressBadge(done, total)).toBe(expected);
  });
});
