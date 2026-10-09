import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { WorkTaskStatus } from '../enums/work-task-status.enum';
import { NotificationModel } from '../models/notifications';
import { WorkItemKind } from '../models/work-items';
import { translocoTestingProviders } from '../testing/transloco-testing';
import {
  groupNotificationsByDay,
  isSystemNotification,
  notificationDeletedTarget,
  notificationLink,
  notificationShowsDeletedComment,
  notificationTaskLabel,
  notificationView,
  titleWithUnread,
  unreadBadge,
} from './notification.utils';

const notification = (overrides: Partial<NotificationModel> = {}): NotificationModel => ({
  id: 'n1',
  type: NotificationType.TaskAssigned,
  createdAt: '2026-10-02T09:00:00Z',
  readAt: null,
  actor: { id: 'u1', name: 'Leyla', surname: 'Mammadova', avatarPath: null },
  projectId: 'p1',
  entityType: NotificationEntityType.WorkTask,
  entityId: 't1',
  workTicketId: 'k1',
  taskStatusId: 1,
  taskDeadline: null,
  commentId: null,
  parameters: {
    projectTitle: 'Project Alpha',
    taskCode: '41',
    taskTitle: 'Payment form',
    taskKind: 1,
    fromStatusId: null,
    toStatusId: null,
    deadline: null,
  },
  entityDeleted: false,
  commentDeleted: false,
  ...overrides,
});

const withParameters = (
  type: NotificationType,
  parameters: Partial<NotificationModel['parameters']>,
): NotificationModel =>
  notification({ type, parameters: { ...notification().parameters, ...parameters } });

/** 5 Oct 2026, noon: the day the reminders below are read on. */
const now = new Date(2026, 9, 5, 12);

/** The second line as read: "Leyla M. moved it to [Done]". */
const line = (value: NotificationModel) => {
  const view = notificationView(value, now);
  const transloco = TestBed.inject(TranslocoService);
  const params = { ...view.actionParams };
  if (view.includeActor) {
    params['actor'] = view.actor ?? transloco.translate('notifications.someone');
  }
  const action = transloco.translate(view.actionKey, params);
  return [action, view.status && `[${view.status.name}]`].filter(Boolean).join(' ');
};

describe('notificationView', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...translocoTestingProviders()] });
  });

  it.each([
    [notification(), 'Leyla M. assigned it to you'],
    [
      withParameters(NotificationType.TaskStatusChanged, {
        fromStatusId: WorkTaskStatus.InProgress,
        toStatusId: WorkTaskStatus.Done,
      }),
      'Leyla M. moved it to [Done]',
    ],
    [
      withParameters(NotificationType.TaskStatusChanged, { toStatusId: WorkTaskStatus.InProgress }),
      'Leyla M. moved it to [In Progress]',
    ],
    [notification({ type: NotificationType.CommentAdded }), 'Leyla M. commented'],
    [notification({ type: NotificationType.Mentioned }), 'Leyla M. mentioned you in a comment'],
    [withParameters(NotificationType.DueToday, { deadline: '2026-10-05' }), 'Due today'],
    [withParameters(NotificationType.DueToday, { deadline: '2026-10-03' }), 'Due 3 Oct'],
    [withParameters(NotificationType.TaskOverdue, { deadline: '2026-09-30' }), 'Was due 30 Sep'],
    [notification({ type: NotificationType.TaskOverdue }), 'Overdue'],
    [
      notification({ type: NotificationType.AddedToProject, entityType: NotificationEntityType.Project }),
      'Leyla M. added you to the project',
    ],
    [notification({ actor: null }), 'Someone assigned it to you'],
    [notification({ type: 99 }), 'Leyla M. sent you a notification'],
  ])('says who did what for every type: %#', (value, expected) => {
    expect(line(value)).toBe(expected);
  });

  it('names the work the way every list does: kind, code and title', () => {
    expect(notificationView(notification(), now).subject).toEqual({
      kind: WorkItemKind.Task,
      code: '41',
      title: 'Payment form',
    });
    expect(notificationView(withParameters(NotificationType.TaskAssigned, { taskKind: 2 }), now).subject.kind).toBe(
      WorkItemKind.Subtask,
    );
    expect(
      notificationView(
        notification({ type: NotificationType.AddedToProject, entityType: NotificationEntityType.Project }),
        now,
      ).subject,
    ).toEqual({ kind: WorkItemKind.Project, code: null, title: 'Project Alpha' });
  });

  it('names nobody on a deadline reminder', () => {
    expect(notificationView(notification({ type: NotificationType.DueToday }), now).actor).toBeNull();
  });

  it('shows the overdue pill only while the task is still open and late', () => {
    const overdue = (change: Partial<NotificationModel>) =>
      notificationView(
        notification({
          type: NotificationType.TaskOverdue,
          taskStatusId: WorkTaskStatus.InProgress,
          taskDeadline: '2026-09-30T20:00:00Z',
          ...change,
        }),
        now,
      ).overdueDeadline;

    expect(overdue({})).toBe('2026-09-30T20:00:00Z');
    expect(overdue({ taskStatusId: WorkTaskStatus.Done })).toBeNull();
    expect(overdue({ taskDeadline: '2026-10-10T20:00:00Z' })).toBeNull();
    expect(overdue({ taskDeadline: null })).toBeNull();
    expect(overdue({ entityDeleted: true, taskStatusId: null })).toBeNull();
    expect(overdue({ type: NotificationType.TaskAssigned })).toBeNull();
  });

  it('names a subtask as one when its page is gone', () => {
    expect(notificationTaskLabel({ ...notification().parameters, taskKind: 2 })).toBe(
      'SUBTASK #41 Payment form',
    );
  });
});

describe('unread count on the bell and in the tab title', () => {
  it.each([
    [0, null],
    [3, '3'],
    [99, '99'],
    [120, '99+'],
  ])('shows %i as %s', (count, badge) => {
    expect(unreadBadge(count)).toBe(badge);
  });

  it('puts the count in front of the title, replaces it, and takes it away at zero', () => {
    expect(titleWithUnread('BAIM', 3)).toBe('(3) BAIM');
    expect(titleWithUnread('(3) BAIM', 120)).toBe('(99+) BAIM');
    expect(titleWithUnread('(99+) BAIM', 0)).toBe('BAIM');
    expect(titleWithUnread('BAIM', 0)).toBe('BAIM');
  });
});

describe('notificationLink', () => {
  it('opens the task under the ticket it is in now', () => {
    expect(notificationLink(notification())).toEqual({
      commands: ['/projects', 'p1', 'tickets', 'k1', 'tasks', 't1'],
    });
  });

  it('opens a comment on the task details, scrolled to the comment', () => {
    expect(
      notificationLink(notification({ type: NotificationType.Mentioned, commentId: 'c1' })),
    ).toEqual({
      commands: ['/projects', 'p1', 'tickets', 'k1', 'tasks', 't1'],
      fragment: 'comment-c1',
    });
  });

  it('opens the project of an AddedToProject', () => {
    const value = notification({
      type: NotificationType.AddedToProject,
      entityType: NotificationEntityType.Project,
      entityId: 'p1',
      workTicketId: null,
    });

    expect(notificationLink(value)).toEqual({ commands: ['/projects', 'p1'] });
  });

  it('leads nowhere when what it points to was deleted', () => {
    expect(notificationLink(notification({ entityDeleted: true }))).toBeNull();
    expect(notificationLink(notification({ workTicketId: null }))).toBeNull();
  });

  it('names what was deleted for the Notice', () => {
    expect(notificationDeletedTarget(notification())).toBe('task');
    expect(notificationDeletedTarget(withParameters(NotificationType.TaskAssigned, { taskKind: 2 }))).toBe(
      'subtask',
    );
    expect(
      notificationDeletedTarget(notification({ entityType: NotificationEntityType.Project })),
    ).toBe('project');
  });
});

describe('groupNotificationsByDay', () => {
  const now = new Date(2026, 9, 2, 15, 0);
  const at = (date: Date) => notification({ id: date.toISOString(), createdAt: date.toISOString() });

  it('puts the rows under Today, Yesterday and the date, newest first', () => {
    const groups = groupNotificationsByDay(
      [
        at(new Date(2026, 9, 2, 9, 0)),
        at(new Date(2026, 9, 2, 0, 5)),
        at(new Date(2026, 9, 1, 23, 50)),
        at(new Date(2026, 8, 28, 12, 0)),
        at(new Date(2025, 11, 28, 12, 0)),
      ],
      now,
    );

    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ['Today', 2],
      ['Yesterday', 1],
      ['28 Sep', 1],
      ['28 Dec 2025', 1],
    ]);
  });

  it('has no groups for no rows', () => {
    expect(groupNotificationsByDay([], now)).toEqual([]);
  });
});

describe('notification flags', () => {
  it('says a comment was deleted only for comment notifications', () => {
    expect(
      notificationShowsDeletedComment(
        notification({ type: NotificationType.CommentAdded, commentDeleted: true }),
      ),
    ).toBe(true);
    expect(
      notificationShowsDeletedComment(
        notification({ type: NotificationType.Mentioned, commentDeleted: true }),
      ),
    ).toBe(true);
    expect(
      notificationShowsDeletedComment(notification({ type: NotificationType.CommentAdded })),
    ).toBe(false);
  });

  it('tells deadline reminders from what people did', () => {
    expect(isSystemNotification(notification({ type: NotificationType.DueToday }))).toBe(true);
    expect(isSystemNotification(notification({ type: NotificationType.TaskOverdue }))).toBe(true);
    expect(isSystemNotification(notification())).toBe(false);
  });
});
