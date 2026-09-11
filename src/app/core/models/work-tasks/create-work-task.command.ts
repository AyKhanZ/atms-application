export interface CreateWorkTaskCommand {
  workTicketId: string;
  parentWorkTaskId?: string | null;
  title: string;
  description?: string | null;
  priorityId: number;
  deadline?: string | null;
  assigneeId?: string | null;
}
