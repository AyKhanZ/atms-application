import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import {
  parseTaskTab,
  taskBreadcrumbTrail,
  taskDeleteConfirmation,
  taskParentRoute,
  taskTabQueryParam,
} from './task-details.utils';

const task = (extra: Partial<WorkTaskModel> = {}): WorkTaskModel => ({
  id: 'sub',
  code: '71',
  title: 'Subtask',
  workProjectId: 'p',
  workTicket: { id: 't', code: '20', name: 'Ticket' },
  groupId: 'g',
  groupTitle: 'Group',
  milestoneId: 'm',
  milestoneTitle: 'Milestone',
  isSubtask: false,
  priority: { id: 1, code: 'Low', name: 'Low' },
  status: { id: 1, code: 'New', name: 'New' },
  subtaskCount: 0,
  doneSubtaskCount: 0,
  ...extra,
});

describe('task details helpers', () => {
  it.each([
    [null, 'details'],
    ['details', 'details'],
    ['subtasks', 'subtasks'],
    ['attachments', 'attachments'],
    ['comments', 'details'],
    ['history', 'history'],
    ['unknown', 'details'],
  ] as const)('parses %s as %s', (value, expected) => expect(parseTaskTab(value)).toBe(expected));

  it('omits the default tab from the query string', () => {
    expect(taskTabQueryParam('details')).toBeNull();
    expect(taskTabQueryParam('subtasks')).toBe('subtasks');
  });

  it("leads a task up to its ticket's tasks", () => {
    expect(taskParentRoute(task())).toEqual({
      commands: ['/projects', 'p', 'tickets', 't'],
      queryParams: { tab: 'tasks' },
    });
  });

  it("leads a subtask up to its parent task's subtasks", () => {
    const subtask = task({ isSubtask: true, parentWorkTask: { id: 'parent', code: '34', name: 'Parent' } });

    expect(taskParentRoute(subtask)).toEqual({
      commands: ['/projects', 'p', 'tickets', 't', 'tasks', 'parent'],
      queryParams: { tab: 'subtasks' },
    });
  });

  // Without the parent task the trail jumped straight from the ticket to the subtask.
  it('keeps the parent task in the trail of a subtask', () => {
    const subtask = task({
      isSubtask: true,
      parentWorkTask: { id: 'parent', code: '34', name: 'Parent' },
    });
    const project = { code: '7', title: 'Payments' };

    expect(taskBreadcrumbTrail(project, subtask).map((item) => item.title)).toEqual([
      'nav.projects',
      '#7 Payments',
      '#20 Ticket',
      '#34 Parent',
      '#71 Subtask',
    ]);
  });

  it('names a task deleted with its subtasks', () => {
    TestBed.configureTestingModule({ providers: [...translocoTestingProviders()] });
    const confirmation = taskDeleteConfirmation(
      task({ code: '7', title: 'Payment', subtaskCount: 2 }),
      TestBed.inject(TranslocoService),
      () => undefined,
    );

    expect(confirmation.header).toBe('Delete task?');
    expect(confirmation.message).toBe(
      '#7 Payment\nIt will be deleted together with its 2 subtasks.',
    );
    expect(confirmation.acceptLabel).toBe('Delete task and subtasks');
    expect(confirmation.rejectLabel).toBe('Cancel');
  });

  it('names a subtask deleted on its own', () => {
    TestBed.configureTestingModule({ providers: [...translocoTestingProviders()] });
    const confirmation = taskDeleteConfirmation(
      task({ isSubtask: true, code: '8', title: 'Check' }),
      TestBed.inject(TranslocoService),
      () => undefined,
    );

    expect(confirmation.header).toBe('Delete subtask?');
    expect(confirmation.message).toBe('#8 Check\nThis subtask will be deleted.');
    expect(confirmation.acceptLabel).toBe('Delete');
    expect(confirmation.rejectLabel).toBe('Cancel');
  });
});
