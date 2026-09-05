export interface UpdateWorkTaskCommand {
  title: string;
  description?: string | null;
  priorityId: number;
  statusId: number;
  deadline?: string | null;
  assigneeId?: string | null;
}
