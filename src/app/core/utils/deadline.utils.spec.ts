import { WorkTaskStatus } from '../enums/work-task-status.enum';
import { daysLate, isOverdueTask, lateLabel } from './deadline.utils';

describe('deadline utils', () => {
  // Local noon, so no time zone can push "now" into another day.
  const now = new Date(2026, 8, 23, 12, 0);
  const localMidnight = (day: number) => new Date(2026, 8, day).toISOString();

  it.each([
    [localMidnight(20), 3],
    [localMidnight(22), 1],
    [localMidnight(23), 0],
    [localMidnight(30), 0],
    [null, 0],
  ])('counts %s as %i days late', (deadline, expected) => {
    expect(daysLate(deadline, now)).toBe(expected);
  });

  it.each([
    [1, '1d'],
    [13, '13d'],
    [14, '2w'],
    [59, '8w'],
    [85, '2mo'],
    [364, '12mo'],
    [400, '1yr'],
  ])('says %i days late as %s', (days, expected) => {
    expect(lateLabel(days)).toBe(expected);
  });

  it.each([
    [WorkTaskStatus.New, localMidnight(20), true],
    [WorkTaskStatus.InProgress, localMidnight(22), true],
    [WorkTaskStatus.Done, localMidnight(20), false],
    [WorkTaskStatus.New, localMidnight(23), false],
    [WorkTaskStatus.New, null, false],
  ])('status %i with deadline %s is overdue: %s', (status, deadline, expected) => {
    expect(isOverdueTask({ status: { id: status }, deadline }, now)).toBe(expected);
  });
});
