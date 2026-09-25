import { HistoryAction } from '../../core/enums/history-action.enum';
import { HistoryEntityType } from '../../core/enums/history-entity-type.enum';
import { HistoryField } from '../../core/enums/history-field.enum';
import { DashboardActivityModel } from '../../core/models/dashboard';
import { historySummary, historyValueText } from '../../core/utils/history.utils';

export interface DashboardActivityText {
  before: string;
  subject: string;
  after: string;
}

export function dashboardActivityText(activity: DashboardActivityModel): DashboardActivityText {
  const { entry, subject } = activity;
  const name = `${subject.type.toUpperCase()} #${subject.code} ${subject.title}`;
  const isProjectDetail =
    entry.entityType === HistoryEntityType.WorkGroup ||
    entry.entityType === HistoryEntityType.Milestone;

  if (isProjectDetail) {
    return {
      before: `${historySummary(entry, 'project')} in`,
      subject: name,
      after: '',
    };
  }

  if (entry.action === HistoryAction.Created) {
    return { before: 'created', subject: name, after: '' };
  }
  if (entry.action === HistoryAction.Deleted) {
    return { before: 'deleted', subject: name, after: '' };
  }

  const [change] = entry.changes;
  if (
    subject.type !== 'project' &&
    entry.changes.length === 1 &&
    change &&
    change.field === HistoryField.Status &&
    change.newValue
  ) {
    return {
      before: 'moved',
      subject: name,
      after: `to ${historyValueText(HistoryField.Status, change.newValue)}`,
    };
  }

  return {
    before: `${historySummary(entry, subject.type)} on`,
    subject: name,
    after: '',
  };
}
