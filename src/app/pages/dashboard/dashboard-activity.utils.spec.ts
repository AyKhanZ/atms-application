import { HistoryAction } from '../../core/enums/history-action.enum';
import { HistoryEntityType } from '../../core/enums/history-entity-type.enum';
import { HistoryField } from '../../core/enums/history-field.enum';
import { DashboardActivityModel } from '../../core/models/dashboard';
import { WorkItemKind } from '../../core/models/work-items';
import { dashboardActivityLine } from './dashboard-activity.utils';

const taskActivity: DashboardActivityModel = {
  ref: { projectId: 'project-1', workTicketId: 'ticket-1', workTaskId: 'task-1' },
  subject: { type: 'task', code: '41', title: 'Payment form', isDeleted: false },
  entry: {
    id: 'entry-1',
    entityType: HistoryEntityType.WorkTask,
    action: HistoryAction.Updated,
    createdAt: '2026-09-25T10:00:00Z',
    changes: [{ field: HistoryField.Status, newValue: { id: '3', code: 'Done', name: 'Done' } }],
  },
};

describe('dashboardActivityLine', () => {
  it('reads a status change as a move and colours a close as done', () => {
    expect(dashboardActivityLine(taskActivity)).toEqual({
      kind: WorkItemKind.Task,
      code: '41',
      title: 'Payment form',
      change: 'Moved to Done',
      tone: 'done',
    });
  });

  it('colours a move to another status as progress', () => {
    const activity: DashboardActivityModel = {
      ...taskActivity,
      entry: {
        ...taskActivity.entry,
        changes: [
          {
            field: HistoryField.Status,
            newValue: { id: '2', code: 'InProgress', name: 'In progress' },
          },
        ],
      },
    };

    expect(dashboardActivityLine(activity).tone).toBe('progress');
  });

  it('marks a subtask with the subtask kind', () => {
    const activity: DashboardActivityModel = {
      ...taskActivity,
      subject: { ...taskActivity.subject, isSubtask: true },
    };

    expect(dashboardActivityLine(activity).kind).toBe(WorkItemKind.Subtask);
  });

  it('colours a new task and a task moved back to New with the New dot', () => {
    const created: DashboardActivityModel = {
      ...taskActivity,
      entry: { ...taskActivity.entry, action: HistoryAction.Created, changes: [] },
    };
    const reopened: DashboardActivityModel = {
      ...taskActivity,
      entry: {
        ...taskActivity.entry,
        changes: [{ field: HistoryField.Status, newValue: { id: '1', code: 'New', name: 'New' } }],
      },
    };

    expect(dashboardActivityLine(created).tone).toBe('new');
    expect(dashboardActivityLine(reopened).tone).toBe('new');
  });

  it('leaves an edit without a status change uncoloured', () => {
    const activity: DashboardActivityModel = {
      ...taskActivity,
      entry: {
        ...taskActivity.entry,
        changes: [{ field: HistoryField.Title, newValue: { id: 'A', code: '', name: 'A' } }],
      },
    };

    expect(dashboardActivityLine(activity).tone).toBe('edited');
  });

  it('keeps a deleted task readable', () => {
    const activity: DashboardActivityModel = {
      ...taskActivity,
      subject: { ...taskActivity.subject, isDeleted: true },
      entry: { ...taskActivity.entry, action: HistoryAction.Deleted, changes: [] },
    };

    expect(dashboardActivityLine(activity)).toEqual({
      kind: WorkItemKind.Task,
      code: '41',
      title: 'Payment form',
      change: 'Deleted',
      tone: 'deleted',
    });
  });

  it('names the group of a project history record', () => {
    const activity: DashboardActivityModel = {
      ...taskActivity,
      subject: { type: 'project', code: '7', title: 'Alpha', isDeleted: false },
      entry: {
        ...taskActivity.entry,
        entityType: HistoryEntityType.WorkGroup,
        action: HistoryAction.Created,
        subject: { id: 'group-1', code: '', name: 'Design' },
        changes: [],
      },
    };

    expect(dashboardActivityLine(activity)).toEqual({
      kind: WorkItemKind.Project,
      code: '7',
      title: 'Alpha',
      change: 'Created group Design',
      tone: 'edited',
    });
  });
});
