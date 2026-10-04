import { formatDate } from '@angular/common';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { WorkTaskStatus } from '../enums/work-task-status.enum';
import { DictionaryModel } from '../models/dictionary.model';
import { NotificationModel, NotificationParametersModel } from '../models/notifications';
import { WorkItemKind } from '../models/work-items';
import { commentAnchor } from './comment-anchor.utils';
import { isOverdueTask, startOfDay, startOfToday } from './deadline.utils';
import { personShortName } from './person-name.utils';

/** The work a notification is about, named as it was when the notification was written. */
export interface NotificationSubject {
  kind: WorkItemKind;
  code: string | null;
  title: string;
}

/**
 * One notification the way a row draws it: the work it is about on the first line, the way every
 * list names work, and who did what on the second, in plain text — only the title stands out.
 */
export interface NotificationView {
  subject: NotificationSubject;
  /** "Leyla M."; `null` for a deadline reminder, which nobody sent. */
  actor: string | null;
  /** "assigned it to you", "moved it to", "Due today", "Was due 5 Oct". */
  action: string;
  /** The status a task was moved to, drawn as the status dot every list uses. */
  status: DictionaryModel | null;
  /** The deadline the overdue pill counts from: only while the task is open and late now. */
  overdueDeadline: string | null;
}

/** Where a notification leads: a route and, for a comment, the comment on the task's page. */
export interface NotificationLink {
  commands: string[];
  fragment?: string;
}

const statuses: Record<number, DictionaryModel> = {
  [WorkTaskStatus.New]: { id: WorkTaskStatus.New, code: 'New', name: 'New' },
  [WorkTaskStatus.InProgress]: { id: WorkTaskStatus.InProgress, code: 'InProgress', name: 'In Progress' },
  [WorkTaskStatus.Done]: { id: WorkTaskStatus.Done, code: 'Done', name: 'Done' },
};

/** The server's `WorkTaskKindEnum.Subtask`. */
const subtaskKind = 2;

/** "TASK #41 Payment form", as it was called when the notification was written. */
export function notificationTaskLabel(parameters: NotificationParametersModel): string {
  const kind = parameters.taskKind === subtaskKind ? 'SUBTASK' : 'TASK';
  const code = parameters.taskCode ? ` #${parameters.taskCode}` : '';
  const title = parameters.taskTitle ? ` ${parameters.taskTitle}` : '';
  return `${kind}${code}${title}`;
}

/**
 * What a row shows, built here from the type and the parameters: the server keeps no text, so a
 * renamed person reads with their new name and the interface language is the interface's.
 */
export function notificationView(notification: NotificationModel, now = new Date()): NotificationView {
  const subject = notificationSubject(notification);
  const actor = isSystemNotification(notification)
    ? null
    : notification.actor
      ? personShortName(notification.actor)
      : 'Someone';
  const view = (action: string, status: DictionaryModel | null = null): NotificationView => ({
    subject,
    actor,
    action,
    status,
    overdueDeadline: null,
  });

  switch (notification.type) {
    case NotificationType.TaskAssigned:
      return view('assigned it to you');
    case NotificationType.TaskStatusChanged: {
      const status = statuses[notification.parameters.toStatusId ?? 0];
      return status ? view('moved it to', status) : view('changed its status');
    }
    case NotificationType.CommentAdded:
      return view('commented');
    case NotificationType.Mentioned:
      return view('mentioned you in a comment');
    case NotificationType.DueToday: {
      // A reminder read on a later day says the date, not "today".
      const deadline = parseDeadline(notification.parameters.deadline);
      const today = !deadline || deadline.getTime() === startOfToday(now).getTime();
      return withOverdue(view(today ? 'Due today' : `Due ${formatDeadline(deadline)}`), notification, now);
    }
    case NotificationType.TaskOverdue: {
      const deadline = deadlineLabel(notification.parameters.deadline);
      return withOverdue(view(deadline ? `Was due ${deadline}` : 'Overdue'), notification, now);
    }
    case NotificationType.AddedToProject:
      return view('added you to the project');
    default:
      return view('sent you a notification');
  }
}

function notificationSubject(notification: NotificationModel): NotificationSubject {
  const parameters = notification.parameters;
  if (notification.entityType === NotificationEntityType.Project) {
    return { kind: WorkItemKind.Project, code: null, title: parameters.projectTitle ?? 'Project' };
  }

  return {
    kind: parameters.taskKind === subtaskKind ? WorkItemKind.Subtask : WorkItemKind.Task,
    code: parameters.taskCode,
    title: parameters.taskTitle ?? '',
  };
}

/**
 * A reminder carries the red pill only while the task is still late: the reminder is about the
 * past, the pill about now — a task done or given a new date since is not overdue any more.
 */
function withOverdue(view: NotificationView, notification: NotificationModel, now: Date): NotificationView {
  const { taskStatusId, taskDeadline } = notification;
  const overdue =
    !notification.entityDeleted &&
    taskStatusId !== null &&
    isOverdueTask({ deadline: taskDeadline, status: { id: taskStatusId } }, now);
  return overdue ? { ...view, overdueDeadline: taskDeadline } : view;
}

/** The unread count as the bell and the tab title show it: "3", "99+", nothing for zero. */
export function unreadBadge(count: number): string | null {
  return count > 99 ? '99+' : count > 0 ? `${count}` : null;
}

/**
 * The tab title with the unread count in front, as Gmail and GitHub show it: seen while the tab is in
 * the background, without a sound. A count already in front is replaced, not stacked.
 */
export function titleWithUnread(title: string, count: number): string {
  const base = title.replace(/^\(\d+\+?\) /, '');
  const badge = unreadBadge(count);
  return badge ? `(${badge}) ${base}` : base;
}

/** The comment a notification was about is gone: say so instead of leading to nothing. */
export function notificationShowsDeletedComment(notification: NotificationModel): boolean {
  return (
    notification.commentDeleted &&
    (notification.type === NotificationType.CommentAdded ||
      notification.type === NotificationType.Mentioned)
  );
}

/** Sent by the system, not by a person: a deadline reminder. */
export function isSystemNotification(notification: NotificationModel): boolean {
  return (
    notification.type === NotificationType.DueToday ||
    notification.type === NotificationType.TaskOverdue
  );
}

/**
 * The page a notification opens, or `null` when what it points to was deleted. A comment opens on
 * the task's Details, scrolled to the comment — a deleted one shows its placeholder there.
 */
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

/** "project", "task" or "subtask": what the Notice names when the target was deleted. */
export function notificationDeletedTarget(notification: NotificationModel): string {
  if (notification.entityType === NotificationEntityType.Project) return 'project';
  return notification.parameters.taskKind === subtaskKind ? 'subtask' : 'task';
}

/** Notifications of one day on the Notifications page. */
export interface NotificationDayGroup {
  /** "Today", "Yesterday", "28 Sep", or "28 Dec 2025" for another year. */
  label: string;
  items: NotificationModel[];
}

/** The page's rows by day, in the order they come — newest first. */
export function groupNotificationsByDay(
  items: readonly NotificationModel[],
  now = new Date(),
): NotificationDayGroup[] {
  const today = startOfToday(now);
  const groups: NotificationDayGroup[] = [];

  for (const item of items) {
    const day = startOfDay(item.createdAt);
    const days = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    const label =
      days <= 0
        ? 'Today'
        : days === 1
          ? 'Yesterday'
          : formatDate(day, day.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM y', 'en-US');
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return groups;
}

/** A `yyyy-MM-dd` date as local midnight: parsed as UTC it would be the day before west of Greenwich. */
function parseDeadline(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDeadline(deadline: Date): string {
  return formatDate(deadline, 'd MMM', 'en-US');
}

function deadlineLabel(value: string | null): string | null {
  const deadline = parseDeadline(value);
  return deadline ? formatDeadline(deadline) : null;
}
