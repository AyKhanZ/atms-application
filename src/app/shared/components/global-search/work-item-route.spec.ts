import { GlobalSearchItemModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';
import { isSearchable, workItemRoute } from './work-item-route';

function item(itemType: WorkItemKind, extra: Partial<GlobalSearchItemModel> = {}) {
  return {
    itemType,
    id: 'item-1',
    code: '34',
    title: 'Title',
    project: { id: 'p7', code: '7', name: 'Project' },
    status: { id: 1, code: 'New', name: 'New' },
    ...extra,
  } as GlobalSearchItemModel;
}

describe('workItemRoute', () => {
  it('opens a project on its own page', () => {
    expect(workItemRoute(item(WorkItemKind.Project))).toBe('/projects/p7');
  });

  it('opens a ticket inside its project', () => {
    expect(workItemRoute(item(WorkItemKind.Ticket))).toBe('/projects/p7/tickets/item-1');
  });

  it('opens a task through its ticket', () => {
    const task = item(WorkItemKind.Task, {
      ticket: { id: 't28', code: '28', name: 'Ticket' },
    });

    expect(workItemRoute(task)).toBe('/projects/p7/tickets/t28/tasks/item-1');
  });

  // A subtask has its own page under the same ticket as its parent task.
  it('opens a subtask the same way as a task', () => {
    const subtask = item(WorkItemKind.Subtask, {
      ticket: { id: 't28', code: '28', name: 'Ticket' },
      parentTask: { id: 't34', code: '34', name: 'Task' },
    });

    expect(workItemRoute(subtask)).toBe('/projects/p7/tickets/t28/tasks/item-1');
  });
});

describe('isSearchable', () => {
  it.each([
    ['', false],
    ['  ', false],
    // A code is matched exactly, so a single digit is already a usable query.
    ['1', true],
    ['34', true],
    ['#34', true],
    // A hash with no number behind it asks for nothing.
    ['#', false],
    ['###', false],
    // A title is matched with "contains", and the index needs three characters to help.
    ['ab', false],
    ['abc', true],
    ['  abc  ', true],
    [`${'a'.repeat(101)}`, false],
  ])('%s -> %s', (value, expected) => {
    expect(isSearchable(value)).toBe(expected);
  });
});
