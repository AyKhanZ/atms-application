import { HistoryAction } from '../../core/enums/history-action.enum';
import { HistoryEntityType } from '../../core/enums/history-entity-type.enum';
import { HistoryField } from '../../core/enums/history-field.enum';
import { DashboardActivityModel } from '../../core/models/dashboard';
import { dashboardActivityText } from './dashboard-activity.utils';

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

describe('dashboardActivityText', () => {
  it('places the task reference inside a status change sentence', () => {
    expect(dashboardActivityText(taskActivity)).toEqual({
      before: 'moved',
      subject: 'TASK #41 Payment form',
      after: 'to Done',
    });
  });

  it('keeps a deleted task readable', () => {
    const activity: DashboardActivityModel = {
      ...taskActivity,
      subject: { ...taskActivity.subject, isDeleted: true },
      entry: { ...taskActivity.entry, action: HistoryAction.Deleted, changes: [] },
    };

    expect(dashboardActivityText(activity)).toEqual({
      before: 'deleted',
      subject: 'TASK #41 Payment form',
      after: '',
    });
  });

  it('names the group and its project for a project history record', () => {
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

    expect(dashboardActivityText(activity)).toEqual({
      before: 'created group Design in',
      subject: 'PROJECT #7 Alpha',
      after: '',
    });
  });
});
