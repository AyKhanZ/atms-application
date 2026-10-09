import { formatDate } from '@angular/common';
import { angularLocale } from '../i18n/active-language';
import { relativePhrase } from '../i18n/relative-time';
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

export type HistorySubject = 'project' | 'ticket' | 'task' | 'subtask';

export type HistoryTranslate = (key: string, params?: Record<string, string | number>) => string;

export type HistoryGroupId = 'today' | 'yesterday' | 'last7' | 'last30' | 'older';

export interface HistoryGroup {
  id: HistoryGroupId;
  entries: HistoryEntryModel[];
}

const dayMs = 86_400_000;
const groupOrder: HistoryGroupId[] = ['today', 'yesterday', 'last7', 'last30', 'older'];

const fieldLabelKeys: Record<HistoryField, string> = {
  [HistoryField.Title]: 'common.title',
  [HistoryField.Description]: 'common.description',
  [HistoryField.Status]: 'common.status',
  [HistoryField.Priority]: 'common.priority',
  [HistoryField.Assignee]: 'common.assignee',
  [HistoryField.Deadline]: 'common.deadline',
  [HistoryField.Type]: 'common.type',
  [HistoryField.Kind]: 'common.kind',
  [HistoryField.Milestone]: 'plan.milestone',
  [HistoryField.WorkTicket]: 'workItem.kind.ticket',
  [HistoryField.ParentWorkTask]: 'common.parent',
  [HistoryField.Organization]: 'common.organization',
  [HistoryField.StartDate]: 'common.startDate',
  [HistoryField.EndDate]: 'history.fields.endDate',
  [HistoryField.Stakeholder]: 'history.fields.stakeholders',
  [HistoryField.Attachment]: 'history.fields.files',
};

const subjectKeys: Record<HistorySubject, string> = {
  project: 'history.subject.project',
  ticket: 'history.subject.ticket',
  task: 'history.subject.task',
  subtask: 'history.subject.subtask',
};

const dateFields = new Set([HistoryField.Deadline, HistoryField.StartDate, HistoryField.EndDate]);

// same formats as the attachments tab: "22 Sep", "22 Sep 2026"
const format = (date: Date, pattern: string) => formatDate(date, pattern, angularLocale());

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

export function historyFieldLabel(field: HistoryField, translate: HistoryTranslate): string {
  return translate(fieldLabelKeys[field] ?? 'history.fields.field');
}

export function isHistoryDateField(field: HistoryField): boolean {
  return dateFields.has(field);
}

// newest first: today, yesterday, last week, last month, the rest
export function groupHistory(entries: HistoryEntryModel[], now = new Date()): HistoryGroup[] {
  const today = startOfToday(now).getTime();
  const groups = new Map<HistoryGroupId, HistoryEntryModel[]>();

  for (const entry of entries) {
    const days = Math.round((today - startOfDay(entry.createdAt).getTime()) / dayMs);
    const id: HistoryGroupId =
      days <= 0 ? 'today' : days === 1 ? 'yesterday' : days <= 7 ? 'last7' : days <= 30 ? 'last30' : 'older';
    const group = groups.get(id);
    if (group) group.push(entry);
    else groups.set(id, [entry]);
  }

  return groupOrder.filter((id) => groups.has(id)).map((id) => ({ id, entries: groups.get(id) ?? [] }));
}

export function historyGroupKey(id: HistoryGroupId): string {
  switch (id) {
    case 'today':
      return 'common.today';
    case 'yesterday':
      return 'notifications.yesterday';
    case 'last7':
      return 'dashboard.periodOption.last7';
    case 'last30':
      return 'dashboard.periodOption.last30';
    case 'older':
      return 'history.older';
  }
}

// "just now", "5 minutes ago", "3 hours ago" within a day, then "9 Sep" or "12 Aug 2025"
export function historyShortTime(
  value: string,
  translate: HistoryTranslate,
  now = new Date(),
): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';

  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return translate('time.now');
  if (minutes < 60) return relativePhrase(-minutes, 'minute', translate);

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relativePhrase(-hours, 'hour', translate);

  if (date.getFullYear() === now.getFullYear()) return format(date, 'd MMM');
  return format(date, 'd MMM y');
}

// "Thu 24 Sep 2026, 14:05"
export function historyFullTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return format(date, 'EEE d MMM y, HH:mm');
}

// "22 Sep 2026"
export function historyDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? format(date, 'd MMM y') : value;
}

export function historyValueText(
  field: HistoryField,
  value: HistoryValueModel | null | undefined,
  translate: HistoryTranslate,
): string {
  if (!value) return '';
  if (isHistoryDateField(field)) return historyDate(value.id);
  if (field === HistoryField.Assignee && value.person) return personFullName(value.person);
  if (field === HistoryField.WorkTicket || field === HistoryField.ParentWorkTask) {
    return value.code
      ? `#${value.code}${value.name ? ` ${value.name}` : ''}`
      : translate('history.unknown');
  }
  return value.name || translate('history.unknown');
}

// "Status · Priority · Deadline"
export function historyFieldList(entry: HistoryEntryModel, translate: HistoryTranslate): string {
  return [...new Set(entry.changes.map((change) => historyFieldLabel(change.field, translate)))].join(
    ' · ',
  );
}

// "changed Status to Done"; several changes name the main one: "assigned X and made 2 more changes"
export function historySummary(
  entry: HistoryEntryModel,
  subject: HistorySubject,
  translate: HistoryTranslate,
): string {
  const named = groupKind(entry);
  const name = entry.subject?.name || translate('history.unknown');

  if (entry.action === HistoryAction.Created) return created(named, name, subject, translate);
  if (entry.action === HistoryAction.Deleted) return deleted(named, name, subject, translate);

  const [change, ...rest] = entry.changes;
  if (!change) return changed(named, name, subject, translate);
  if (rest.length) {
    const main = named ? undefined : mainChange(entry);
    const count = entry.changes.length - (main ? 1 : 0);
    if (main) return translate('history.summary.andMore', { change: changeSummary(main, translate), count });
    if (named === 'group') return translate('history.summary.madeToGroup', { count, name });
    if (named === 'milestone') return translate('history.summary.madeToMilestone', { count, name });
    return translate('history.summary.made', { count });
  }

  if (named) {
    if (change.field === HistoryField.Title) {
      return translate(
        named === 'milestone' ? 'history.summary.renamedMilestone' : 'history.summary.renamedGroup',
        {
          from: change.oldValue?.name || translate('history.unknown'),
          to: change.newValue?.name || translate('history.unknown'),
        },
      );
    }
    return translate(
      named === 'milestone'
        ? 'history.summary.changedFieldOfMilestone'
        : 'history.summary.changedFieldOfGroup',
      {
        field: historyFieldLabel(change.field, translate),
        name,
        value: historyValueText(change.field, change.newValue, translate),
      },
    );
  }

  return changeSummary(change, translate);
}

function created(
  named: 'group' | 'milestone' | null,
  name: string,
  subject: HistorySubject,
  translate: HistoryTranslate,
): string {
  if (named === 'group') return translate('history.summary.createdGroup', { name });
  if (named === 'milestone') return translate('history.summary.createdMilestone', { name });
  return translate('history.summary.created', { subject: translate(subjectKeys[subject]) });
}

function deleted(
  named: 'group' | 'milestone' | null,
  name: string,
  subject: HistorySubject,
  translate: HistoryTranslate,
): string {
  if (named === 'group') return translate('history.summary.deletedGroup', { name });
  if (named === 'milestone') return translate('history.summary.deletedMilestone', { name });
  return translate('history.summary.deleted', { subject: translate(subjectKeys[subject]) });
}

function changed(
  named: 'group' | 'milestone' | null,
  name: string,
  subject: HistorySubject,
  translate: HistoryTranslate,
): string {
  if (named === 'group') return translate('history.summary.changedGroup', { name });
  if (named === 'milestone') return translate('history.summary.changedMilestone', { name });
  return translate('history.summary.changed', { subject: translate(subjectKeys[subject]) });
}

function changeSummary(change: HistoryChangeModel, translate: HistoryTranslate): string {
  const label = historyFieldLabel(change.field, translate);
  const oldText = historyValueText(change.field, change.oldValue, translate);
  const newText = historyValueText(change.field, change.newValue, translate);

  switch (change.field) {
    case HistoryField.Assignee:
      return change.newValue
        ? translate('history.summary.assigned', { name: newText })
        : translate('history.summary.unassigned', { name: oldText });
    case HistoryField.Attachment:
      if (!change.oldValue) return translate('history.summary.added', { name: newText });
      if (!change.newValue) return translate('history.summary.removed', { name: oldText });
      return translate('history.summary.renamed', { from: oldText, to: newText });
    case HistoryField.Stakeholder: {
      const person = personFullName(change.person, translate('history.unknown'));
      if (!change.oldValue) return translate('history.summary.addedAs', { person, role: newText });
      if (!change.newValue) return translate('history.summary.removed', { name: person });
      return translate('history.summary.changedRole', { person, role: newText });
    }
    case HistoryField.Description:
      return change.newValue
        ? translate('history.summary.changedField', { field: label })
        : translate('history.summary.cleared', { field: label });
    default:
      return change.newValue
        ? translate('history.summary.changedTo', { field: label, value: newText })
        : translate('history.summary.cleared', { field: label });
  }
}

export type HistoryMarker =
  | { kind: 'status'; status: HistoryValueModel; tooltip: string }
  | { kind: 'icon'; icon: string; tooltip: string };

// plain edits have no marker
export function historyMarker(entry: HistoryEntryModel, translate: HistoryTranslate): HistoryMarker | null {
  if (entry.action === HistoryAction.Deleted) {
    return { kind: 'icon', icon: 'pi-trash', tooltip: translate('dashboard.activity.deleted') };
  }

  const status = entry.changes.find((change) => change.field === HistoryField.Status)?.newValue;
  if (status) {
    const name = status.name || translate('history.unknown');
    const tooltip =
      entry.action === HistoryAction.Created
        ? translate('history.marker.createdAs', { status: name })
        : translate('history.marker.statusSet', { status: name });
    return { kind: 'status', status, tooltip };
  }
  if (entry.action === HistoryAction.Created) {
    return { kind: 'icon', icon: 'pi-plus-circle', tooltip: translate('dashboard.activity.created') };
  }

  const fields = new Set(entry.changes.map((change) => change.field));
  if (fields.has(HistoryField.Assignee)) {
    return { kind: 'icon', icon: 'pi-user', tooltip: translate('history.marker.assignee') };
  }
  if (fields.has(HistoryField.Attachment)) {
    return { kind: 'icon', icon: 'pi-paperclip', tooltip: fileTooltip(entry.changes, translate) };
  }
  if (fields.has(HistoryField.Stakeholder)) {
    return { kind: 'icon', icon: 'pi-users', tooltip: translate('history.marker.stakeholders') };
  }
  return null;
}

export function historyStateLabel(
  state: { status: HistoryValueModel; changedAt?: string | null },
  index: number,
  recorded: boolean,
  translate: HistoryTranslate,
): string {
  if (!recorded) return translate('history.current');
  if (index === 0) {
    return state.changedAt ? translate('dashboard.activity.created') : translate('history.earlier');
  }
  return translate('dashboard.activity.movedTo', { status: state.status.name || translate('history.unknown') });
}

// status first, then assignee, then a file
function mainChange(entry: HistoryEntryModel): HistoryChangeModel | undefined {
  const order = [HistoryField.Status, HistoryField.Assignee, HistoryField.Attachment];
  return order
    .map((field) => entry.changes.find((change) => change.field === field))
    .find((change) => change !== undefined);
}

function fileTooltip(changes: HistoryChangeModel[], translate: HistoryTranslate): string {
  const files = changes.filter((change) => change.field === HistoryField.Attachment);
  if (files.length > 1) return translate('history.marker.files');
  const [file] = files;
  if (!file.oldValue) return translate('history.marker.fileAdded');
  if (!file.newValue) return translate('history.marker.fileRemoved');
  return translate('history.marker.fileRenamed');
}

function groupKind(entry: HistoryEntryModel): 'group' | 'milestone' | null {
  if (entry.entityType === HistoryEntityType.WorkGroup) return 'group';
  if (entry.entityType === HistoryEntityType.Milestone) return 'milestone';
  return null;
}
