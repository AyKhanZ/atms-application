export interface UpdateWorkTaskCommand {
  title: string;
  description?: string | null;
  priorityId: number;
  statusId: number;
  deadline?: string | null;
  assigneeId?: string | null;
  // ignored by the server when parentWorkTaskId is set
  workTicketId: string;
  // null = top-level task
  parentWorkTaskId?: string | null;
  // Done also closes open subtasks ("Mark all as done")
  completeSubtasks?: boolean;
}
