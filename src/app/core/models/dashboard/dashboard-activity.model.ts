import { HistoryEntryModel } from '../history';
import { DashboardRefModel } from './dashboard-ref.model';
import { DashboardActivitySubjectModel } from './dashboard-activity-subject.model';

export interface DashboardActivityModel {
  ref: DashboardRefModel;
  subject: DashboardActivitySubjectModel;
  entry: HistoryEntryModel;
}
