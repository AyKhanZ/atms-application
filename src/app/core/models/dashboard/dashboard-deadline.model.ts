import { PersonModel } from '../person.model';
import { WorkItemRefModel } from '../work-items';

export interface DashboardDeadlineModel {
  ref: WorkItemRefModel;
  code: string;
  title: string;
  isSubtask: boolean;
  deadline: string;
  priority: { id: number; name: string };
  assignee: PersonModel | null;
}
