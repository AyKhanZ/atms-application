import { HistoryPersonModel } from '../history';
import { DashboardRefModel } from './dashboard-ref.model';

export interface DashboardDeadlineModel {
  ref: DashboardRefModel;
  code: string;
  title: string;
  isSubtask: boolean;
  deadline: string;
  priority: { id: number; name: string };
  assignee: HistoryPersonModel | null;
}
