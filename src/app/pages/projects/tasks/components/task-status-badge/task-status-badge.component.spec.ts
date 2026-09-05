import { taskStatusTone } from './task-status-badge.component';

describe('taskStatusTone', () => {
  it.each([
    ['New', 'neutral'],
    ['InProgress', 'active'],
    ['inprogress', 'active'],
    ['Done', 'success'],
    [' done ', 'success'],
    ['Unknown', 'neutral'],
  ])('maps %s to %s', (code, expected) => {
    expect(taskStatusTone(code)).toBe(expected);
  });
});
