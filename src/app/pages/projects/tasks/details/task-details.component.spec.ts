import { parseTaskTab, taskTabQueryParam } from './task-details.component';

describe('TaskDetailsComponent navigation helpers', () => {
  it.each([
    [null, 'details'],
    ['details', 'details'],
    ['subtasks', 'subtasks'],
    ['attachments', 'attachments'],
    ['history', 'history'],
    ['unknown', 'details'],
  ] as const)('parses %s as %s', (value, expected) => expect(parseTaskTab(value)).toBe(expected));

  it('omits the default tab from the query string', () => {
    expect(taskTabQueryParam('details')).toBeNull();
    expect(taskTabQueryParam('subtasks')).toBe('subtasks');
  });
});
