import { formatDate } from '@angular/common';
import { HistoryAction } from '../enums/history-action.enum';
import { HistoryEntityType } from '../enums/history-entity-type.enum';
import { HistoryField } from '../enums/history-field.enum';
import {
  HistoryChangeModel,
  HistoryEntryModel,
  HistoryScope,
  HistoryValueModel,
} from '../models/history';
import { startOfDay, startOfToday } from './deadline.utils';
import { personFullName } from './person-name.utils';

/** What the history on screen belongs to, as a sentence names it: "created the task". */
export type HistorySubject = 'project' | 'ticket' | 'task' | 'subtask';

export type HistoryGroupLabel = 'Today' | 'Yesterday' | 'Last 7 days' | 'Last 30 days' | 'Older';

export interface HistoryGroup {
  label: HistoryGroupLabel;
  entries: HistoryEntryModel[];
}

const dayMs = 86_400_000;
const groupOrder: HistoryGroupLabel[] = [
  'Today',
  'Yesterday',
  'Last 7 days',
  'Last 30 days',
  'Older',
];

const fieldLabels: Record<HistoryField, string> = {
  [HistoryField.Title]: 'Title',
  [HistoryField.Description]: 'Description',
  [HistoryField.Status]: 'Status',
  [HistoryField.Priority]: 'Priority',
  [HistoryField.Assignee]: 'Assignee',
  [HistoryField.Deadline]: 'Deadline',
  [HistoryField.Type]: 'Type',
  [HistoryField.Kind]: 'Kind',
  [HistoryField.Milestone]: 'Milestone',
  [HistoryField.WorkTicket]: 'Ticket',
  [HistoryField.ParentWorkTask]: 'Parent',
  [HistoryField.Organization]: 'Organization',
  [HistoryField.StartDate]: 'Start date',
  [HistoryField.EndDate]: 'End date',
  [HistoryField.Stakeholder]: 'Stakeholders',
  [HistoryField.Attachment]: 'Files',
};

const dateFields = new Set([HistoryField.Deadline, HistoryField.StartDate, HistoryField.EndDate]);

// The same formats the Attachments tab prints with the date pipe: "22 Sep", "22 Sep 2026".
const format = (date: Date, pattern: string) => formatDate(date, pattern, 'en-US');

/** The store key of one history on screen. */
export function historyKey(projectId: string, scope: HistoryScope): string {
  switch (scope.kind) {
    case 'project':
      return `project:${projectId}`;
    case 'ticket':
      return `ticket:${scope.workTicketId}`;
    case 'task':
      return `task:${scope.workTaskId}`;
  }
}

export function historyFieldLabel(field: HistoryField): string {
  return fieldLabels[field] ?? 'Field';
}

export function isHistoryDateField(field: HistoryField): boolean {
  return dateFields.has(field);
}

/** Newest first, by the calendar day of the viewer: Today, Yesterday, the last week, the last month, the rest. */
export function groupHistory(entries: HistoryEntryModel[], now = new Date()): HistoryGroup[] {
  const today = startOfToday(now).getTime();
  const groups = new Map<HistoryGroupLabel, HistoryEntryModel[]>();

  for (const entry of entries) {
    const days = Math.round((today - startOfDay(entry.createdAt).getTime()) / dayMs);
    const label: HistoryGroupLabel =
      days <= 0
        ? 'Today'
        : days === 1
          ? 'Yesterday'
          : days <= 7
            ? 'Last 7 days'
            : days <= 30
              ? 'Last 30 days'
              : 'Older';
    const group = groups.get(label);
    if (group) group.push(entry);
    else groups.set(label, [entry]);
  }

  return groupOrder
    .filter((label) => groups.has(label))
    .map((label) => ({ label, entries: groups.get(label) ?? [] }));
}

/**
 * "just now", "5 min ago", "3 hours ago" within a day, as Azure DevOps writes it; after that the
 * day — "9 Sep" this year, "12 Aug 2025" before. The exact moment is in the tooltip.
 */
export function historyShortTime(value: string, now = new Date()): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';

  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  if (date.getFullYear() === now.getFullYear()) return format(date, 'd MMM');
  return format(date, 'd MMM y');
}

/** "Thu 24 Sep 2026, 14:05". */
export function historyFullTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return format(date, 'EEE d MMM y, HH:mm');
}

/** "22 Sep 2026" for a stored ISO date. */
export function historyDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? format(date, 'd MMM y') : value;
}

/** A value as a sentence says it: a status by its name, a ticket by its code, a person by the full name. */
export function historyValueText(field: HistoryField, value?: HistoryValueModel | null): string {
  if (!value) return '';
  if (isHistoryDateField(field)) return historyDate(value.id);
  if (field === HistoryField.Assignee && value.person) return personFullName(value.person);
  if (field === HistoryField.WorkTicket || field === HistoryField.ParentWorkTask) {
    return value.code ? `#${value.code}${value.name ? ` ${value.name}` : ''}` : 'Unknown';
  }
  return value.name || 'Unknown';
}

/** "Status · Priority · Deadline": which fields an entry of several changes touched. */
export function historyFieldList(entry: HistoryEntryModel): string {
  return [...new Set(entry.changes.map((change) => historyFieldLabel(change.field)))].join(' · ');
}

/**
 * The sentence after the author's name: "changed Status to Done". Several changes name the one that
 * matters most, as Azure DevOps does — "assigned Dilara Zeynalova and made 2 more changes".
 */
export function historySummary(entry: HistoryEntryModel, subject: HistorySubject): string {
  const group = groupName(entry);
  const target = group ?? `the ${subject}`;

  if (entry.action === HistoryAction.Created) return `created ${target}`;
  if (entry.action === HistoryAction.Deleted) return `deleted ${target}`;

  const [change, ...rest] = entry.changes;
  if (!change) return `changed ${target}`;
  if (rest.length) {
    const main = group ? undefined : mainChange(entry);
    const others = entry.changes.length - (main ? 1 : 0);
    const more = `${others} ${main ? 'more ' : ''}${others === 1 ? 'change' : 'changes'}`;
    if (main) return `${changeSummary(main)} and made ${more}`;
    return `made ${more}${group ? ` to ${group}` : ''}`;
  }

  if (group) {
    const kind = entry.entityType === HistoryEntityType.Milestone ? 'milestone' : 'group';
    if (change.field === HistoryField.Title) {
      return `renamed ${kind} ${change.oldValue?.name || 'Unknown'} to ${change.newValue?.name || 'Unknown'}`;
    }
    return `changed ${historyFieldLabel(change.field)} of ${group} to ${historyValueText(change.field, change.newValue)}`;
  }

  return changeSummary(change);
}

function changeSummary(change: HistoryChangeModel): string {
  const label = historyFieldLabel(change.field);
  const oldText = historyValueText(change.field, change.oldValue);
  const newText = historyValueText(change.field, change.newValue);

  switch (change.field) {
    case HistoryField.Assignee:
      return change.newValue ? `assigned ${newText}` : `unassigned ${oldText}`;
    case HistoryField.Attachment:
      if (!change.oldValue) return `added ${newText}`;
      if (!change.newValue) return `removed ${oldText}`;
      return `renamed ${oldText} to ${newText}`;
    case HistoryField.Stakeholder: {
      const person = personFullName(change.person, 'Unknown');
      if (!change.oldValue) return `added ${person} as ${newText}`;
      if (!change.newValue) return `removed ${person}`;
      return `changed the role of ${person} to ${newText}`;
    }
    case HistoryField.Description:
      return change.newValue ? 'changed Description' : 'cleared Description';
    default:
      return change.newValue ? `changed ${label} to ${newText}` : `cleared ${label}`;
  }
}

/** What an entry is about at a glance: the colour of the status it set, or who or what it touched. */
export type HistoryMarker =
  | { kind: 'status'; status: HistoryValueModel; tooltip: string }
  | { kind: 'icon'; icon: string; tooltip: string };

/** The mark at the right of a row, with the tooltip Azure DevOps puts on it. Plain edits have none. */
export function historyMarker(entry: HistoryEntryModel): HistoryMarker | null {
  if (entry.action === HistoryAction.Deleted) {
    return { kind: 'icon', icon: 'pi-trash', tooltip: 'Deleted' };
  }

  const status = entry.changes.find((change) => change.field === HistoryField.Status)?.newValue;
  if (status) {
    const name = status.name || 'Unknown';
    const tooltip =
      entry.action === HistoryAction.Created ? `Created as ${name}` : `Status set to ${name}`;
    return { kind: 'status', status, tooltip };
  }
  if (entry.action === HistoryAction.Created) {
    return { kind: 'icon', icon: 'pi-plus-circle', tooltip: 'Created' };
  }

  const fields = new Set(entry.changes.map((change) => change.field));
  if (fields.has(HistoryField.Assignee)) {
    return { kind: 'icon', icon: 'pi-user', tooltip: 'Assignee changed' };
  }
  if (fields.has(HistoryField.Attachment)) {
    return { kind: 'icon', icon: 'pi-paperclip', tooltip: fileTooltip(entry.changes) };
  }
  if (fields.has(HistoryField.Stakeholder)) {
    return { kind: 'icon', icon: 'pi-users', tooltip: 'Stakeholders changed' };
  }
  return null;
}

/** The change a sentence about several leads with: the status, then the assignee, then a file. */
function mainChange(entry: HistoryEntryModel): HistoryChangeModel | undefined {
  const order = [HistoryField.Status, HistoryField.Assignee, HistoryField.Attachment];
  return order
    .map((field) => entry.changes.find((change) => change.field === field))
    .find((change) => change !== undefined);
}

function fileTooltip(changes: HistoryChangeModel[]): string {
  const files = changes.filter((change) => change.field === HistoryField.Attachment);
  if (files.length > 1) return 'Files changed';
  const [file] = files;
  if (!file.oldValue) return 'File added';
  if (!file.newValue) return 'File removed';
  return 'File renamed';
}

/** "milestone Sprint 1" when the entry is about a group or milestone of the project. */
function groupName(entry: HistoryEntryModel): string | null {
  if (entry.entityType === HistoryEntityType.WorkGroup) {
    return `group ${entry.subject?.name || 'Unknown'}`;
  }
  if (entry.entityType === HistoryEntityType.Milestone) {
    return `milestone ${entry.subject?.name || 'Unknown'}`;
  }
  return null;
}
