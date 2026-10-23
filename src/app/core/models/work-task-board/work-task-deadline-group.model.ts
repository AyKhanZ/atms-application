import { WorkTaskModel } from '../work-tasks';

// one deadline moment of the calendar month: how many tasks have it and the first few
export interface WorkTaskDeadlineGroupModel {
  deadline: string;
  total: number;
  workTasks: WorkTaskModel[];
}
