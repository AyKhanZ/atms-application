import { HistoryAction } from '../../core/enums/history-action.enum';
import { HistoryEntityType } from '../../core/enums/history-entity-type.enum';
import { HistoryField } from '../../core/enums/history-field.enum';
import { WorkTaskStatus } from '../../core/enums/work-task-status.enum';
import { DashboardActivityModel } from '../../core/models/dashboard';
import { WorkItemKind } from '../../core/models/work-items';
import { historySummary, historyValueText } from '../../core/utils/history.utils';

// created = New, moved = the new status, deleted = red, other edits = hollow grey
export type DashboardActivityTone = 'new' | 'progress' | 'done' | 'deleted' | 'edited';

export interface DashboardActivityLine {
  kind: WorkItemKind;
  code: string;
  title: string;
  change: string;
  tone: DashboardActivityTone;
}

export function dashboardActivityLine(activity: DashboardActivityModel): DashboardActivityLine {
  const { entry, subject } = activity;
  const line = (change: string, tone: DashboardActivityTone): DashboardActivityLine => ({
    kind: subjectKind(activity),
    code: subject.code,
    title: subject.title,
    change: capitalize(change),
    tone,
  });

  // groups and milestones have no page, the row is about the project
  if (
    entry.entityType === HistoryEntityType.WorkGroup ||
    entry.entityType === HistoryEntityType.Milestone
  ) {
    const tone = entry.action === HistoryAction.Deleted ? 'deleted' : 'edited';
    return line(historySummary(entry, 'project'), tone);
  }

  if (entry.action === HistoryAction.Created) return line('created', 'new');
  if (entry.action === HistoryAction.Deleted) return line('deleted', 'deleted');

  const status = entry.changes.find((change) => change.field === HistoryField.Status)?.newValue;
  const tone = status ? statusTone(status.id) : 'edited';
  if (entry.changes.length === 1 && status) {
    return line(`moved to ${historyValueText(HistoryField.Status, status)}`, tone);
  }

  return line(historySummary(entry, subject.type), tone);
}

function statusTone(statusId: string): DashboardActivityTone {
  if (statusId === String(WorkTaskStatus.Done)) return 'done';
  if (statusId === String(WorkTaskStatus.InProgress)) return 'progress';
  return 'new';
}

function subjectKind({ subject }: DashboardActivityModel): WorkItemKind {
  if (subject.type === 'project') return WorkItemKind.Project;
  if (subject.type === 'ticket') return WorkItemKind.Ticket;
  return subject.isSubtask ? WorkItemKind.Subtask : WorkItemKind.Task;
}

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
