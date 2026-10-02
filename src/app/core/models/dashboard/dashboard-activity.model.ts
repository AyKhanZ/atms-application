import { HistoryEntryModel } from '../history';
import { WorkItemRefModel } from '../work-items';
import { DashboardActivitySubjectModel } from './dashboard-activity-subject.model';

export interface DashboardActivityModel {
  ref: WorkItemRefModel;
  subject: DashboardActivitySubjectModel;
  entry: HistoryEntryModel;
}
