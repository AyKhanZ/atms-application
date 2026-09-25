export interface DashboardActivitySubjectModel {
  type: 'task' | 'ticket' | 'project';
  code: string;
  title: string;
  isDeleted: boolean;
  /** Only a task can be one; tells the subtask icon from the task icon. */
  isSubtask?: boolean;
}
