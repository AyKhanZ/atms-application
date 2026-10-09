import { formatDate } from '@angular/common';
import { angularLocale } from '../i18n/active-language';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { WorkTaskStatus } from '../enums/work-task-status.enum';
import { DictionaryModel } from '../models/dictionary.model';
import { NotificationModel, NotificationParametersModel } from '../models/notifications';
import { WorkItemKind } from '../models/work-items';
import { commentAnchor } from './comment-anchor.utils';
import { isOverdueTask, startOfDay, startOfToday } from './deadline.utils';
import { personShortName } from './person-name.utils';

// named as it was when the notification was written
export interface NotificationSubject {
  kind: WorkItemKind;
  code: string | null;
  title: string;
}

export interface NotificationView {
  subject: NotificationSubject;
  // null for a deadline reminder; a missing person becomes notifications.someone at display
  actor: string | null;
  // the phrase owns {actor}, so the name can sit wherever the language puts it
  includeActor: boolean;
  actionKey: string;
  actionParams: Record<string, string>;
  status: DictionaryModel | null;
  // only while the task is still open and late
  overdueDeadline: string | null;
}

export interface NotificationLink {
  commands: string[];
  fragment?: string;
}

const statuses: Record<number, DictionaryModel> = {
  [WorkTaskStatus.New]: { id: WorkTaskStatus.New, code: 'New', name: 'New' },
  [WorkTaskStatus.InProgress]: {
    id: WorkTaskStatus.InProgress,
    code: 'InProgress',
    name: 'In Progress',
  },
  [WorkTaskStatus.Done]: { id: WorkTaskStatus.Done, code: 'Done', name: 'Done' },
};

// server WorkTaskKindEnum.Subtask
const subtaskKind = 2;

export function notificationKindKey(parameters: NotificationParametersModel): string {
  return parameters.taskKind === subtaskKind ? 'workItem.kind.subtask' : 'workItem.kind.task';
}

export function notificationStatusKey(code: string): string | null {
  if (code === 'New') return 'workItem.status.new';
  if (code === 'InProgress') return 'workItem.status.inProgress';
  if (code === 'Done') return 'workItem.status.done';
  return null;
}

// "TASK #41 Payment form"; kindLabel is the translated word, already cased for the line
export function notificationTaskLabel(
  parameters: NotificationParametersModel,
  kindLabel?: string,
): string {
  const kind = kindLabel ?? (parameters.taskKind === subtaskKind ? 'SUBTASK' : 'TASK');
  const code = parameters.taskCode ? ` #${parameters.taskCode}` : '';
  const title = parameters.taskTitle ? ` ${parameters.taskTitle}` : '';
  return `${kind}${code}${title}`;
}

// server keeps no text, so new names and the ui language are used
export function notificationView(
  notification: NotificationModel,
  now = new Date(),
): NotificationView {
  const subject = notificationSubject(notification);
  const actor = isSystemNotification(notification)
    ? null
    : notification.actor
      ? personShortName(notification.actor)
      : null;
  const view = (
    actionKey: string,
    status: DictionaryModel | null = null,
    actionParams: Record<string, string> = {},
    includeActor = true,
  ): NotificationView => ({
    subject,
    actor,
    includeActor,
    actionKey,
    actionParams,
    status,
    overdueDeadline: null,
  });

  switch (notification.type) {
    case NotificationType.TaskAssigned:
      return view('notifications.actions.assigned');
    case NotificationType.TaskStatusChanged: {
      const status = statuses[notification.parameters.toStatusId ?? 0];
      return status
        ? view('notifications.actions.moved', status)
        : view('notifications.actions.statusChanged');
    }
    case NotificationType.CommentAdded:
      return view('notifications.actions.commented');
    case NotificationType.Mentioned:
      return view('notifications.actions.mentioned');
    case NotificationType.DueToday: {
      // reminder read on a later day shows the date, not "today"
      const deadline = parseDeadline(notification.parameters.deadline);
      const today = !deadline || deadline.getTime() === startOfToday(now).getTime();
      return withOverdue(
        today
          ? view('notifications.actions.dueToday', null, {}, false)
          : view('notifications.actions.dueOn', null, { date: formatDeadline(deadline!) }, false),
        notification,
        now,
      );
    }
    case NotificationType.TaskOverdue: {
      const deadline = deadlineLabel(notification.parameters.deadline);
      return withOverdue(
        deadline
          ? view('notifications.actions.wasDue', null, { date: deadline }, false)
          : view('common.overdue', null, {}, false),
        notification,
        now,
      );
    }
    case NotificationType.AddedToProject:
      return view('notifications.actions.added');
    default:
      return view('notifications.actions.sent');
  }
}

function notificationSubject(notification: NotificationModel): NotificationSubject {
  const parameters = notification.parameters;
  if (notification.entityType === NotificationEntityType.Project) {
    return { kind: WorkItemKind.Project, code: null, title: parameters.projectTitle ?? '' };
  }

  return {
    kind: parameters.taskKind === subtaskKind ? WorkItemKind.Subtask : WorkItemKind.Task,
    code: parameters.taskCode,
    title: parameters.taskTitle ?? '',
  };
}

// red pill only while the task is still late, done or moved since = no pill
function withOverdue(
  view: NotificationView,
  notification: NotificationModel,
  now: Date,
): NotificationView {
  const { taskStatusId, taskDeadline } = notification;
  const overdue =
    !notification.entityDeleted &&
    taskStatusId !== null &&
    isOverdueTask({ deadline: taskDeadline, status: { id: taskStatusId } }, now);
  return overdue ? { ...view, overdueDeadline: taskDeadline } : view;
}

// "3", "99+", null for zero
export function unreadBadge(count: number): string | null {
  return count > 99 ? '99+' : count > 0 ? `${count}` : null;
}

// like gmail and github; an existing count is replaced, not stacked
export function titleWithUnread(title: string, count: number): string {
  const base = title.replace(/^\(\d+\+?\) /, '');
  const badge = unreadBadge(count);
  return badge ? `(${badge}) ${base}` : base;
}

export function notificationShowsDeletedComment(notification: NotificationModel): boolean {
  return (
    notification.commentDeleted &&
    (notification.type === NotificationType.CommentAdded ||
      notification.type === NotificationType.Mentioned)
  );
}

export function isSystemNotification(notification: NotificationModel): boolean {
  return (
    notification.type === NotificationType.DueToday ||
    notification.type === NotificationType.TaskOverdue
  );
}

// null when the target was deleted; a comment opens on task Details scrolled to it
export function notificationLink(notification: NotificationModel): NotificationLink | null {
  if (notification.entityDeleted) return null;

  if (notification.entityType === NotificationEntityType.Project) {
    return { commands: ['/projects', notification.entityId] };
  }

  if (!notification.workTicketId) return null;
  const commands = [
    '/projects',
    notification.projectId,
    'tickets',
    notification.workTicketId,
    'tasks',
    notification.entityId,
  ];
  return notification.commentId
    ? { commands, fragment: commentAnchor(notification.commentId) }
    : { commands };
}

export function notificationDeletedTarget(notification: NotificationModel): string {
  if (notification.entityType === NotificationEntityType.Project) return 'project';
  return notification.parameters.taskKind === subtaskKind ? 'subtask' : 'task';
}

export interface NotificationDayGroup {
  // "Today", "Yesterday", or a formatted date; day picks the translation
  label: string;
  day: 'today' | 'yesterday' | 'date';
  items: NotificationModel[];
}

export function groupNotificationsByDay(
  items: readonly NotificationModel[],
  now = new Date(),
): NotificationDayGroup[] {
  const today = startOfToday(now);
  const groups: NotificationDayGroup[] = [];

  for (const item of items) {
    const day = startOfDay(item.createdAt);
    const days = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    const dayKind: NotificationDayGroup['day'] =
      days <= 0 ? 'today' : days === 1 ? 'yesterday' : 'date';
    const label =
      dayKind === 'today'
        ? 'Today'
        : dayKind === 'yesterday'
          ? 'Yesterday'
          : formatDate(
              day,
              day.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM y',
              angularLocale(),
            );
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, day: dayKind, items: [item] });
  }

  return groups;
}

// as local midnight, parsed as utc it would be the day before west of greenwich
function parseDeadline(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDeadline(deadline: Date): string {
  return formatDate(deadline, 'd MMM', angularLocale());
}

function deadlineLabel(value: string | null): string | null {
  const deadline = parseDeadline(value);
  return deadline ? formatDeadline(deadline) : null;
}
