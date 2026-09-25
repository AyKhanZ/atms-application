export interface DashboardActivitySubjectModel {
  type: 'task' | 'ticket' | 'project';
  code: string;
  title: string;
  isDeleted: boolean;
}
