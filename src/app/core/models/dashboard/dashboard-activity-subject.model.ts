export interface DashboardActivitySubjectModel {
  type: 'task' | 'ticket' | 'project';
  code: string;
  title: string;
  isDeleted: boolean;
  // only for tasks, picks the subtask icon
  isSubtask?: boolean;
}
