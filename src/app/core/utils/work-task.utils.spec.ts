import { WorkItemKind } from '../models/work-items';
import { workTaskKind, workTaskParent } from './work-task.utils';

describe('work task utils', () => {
  const ticket = { id: 'ticket-1', code: '28', name: 'Payments' };
  const parentTask = { id: 'task-1', code: '34', name: 'Stripe' };

  it.each([
    [false, WorkItemKind.Task],
    [true, WorkItemKind.Subtask],
  ])('isSubtask=%s is a %s', (isSubtask, kind) => {
    expect(workTaskKind({ isSubtask })).toBe(kind);
  });

  it('puts a subtask under its task', () => {
    expect(
      workTaskParent({ isSubtask: true, workTicket: ticket, parentWorkTask: parentTask }),
    ).toEqual({ ...parentTask, kind: WorkItemKind.Task });
  });

  it('puts a task under its ticket', () => {
    expect(workTaskParent({ isSubtask: false, workTicket: ticket })).toEqual({
      ...ticket,
      kind: WorkItemKind.Ticket,
    });
  });
});
