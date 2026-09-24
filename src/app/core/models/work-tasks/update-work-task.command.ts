export interface UpdateWorkTaskCommand {
  title: string;
  description?: string | null;
  priorityId: number;
  statusId: number;
  deadline?: string | null;
  assigneeId?: string | null;
  /** Ticket the task belongs to. The server ignores it when a parent task is given. */
  workTicketId: string;
  /** Parent task for a subtask; null makes the item a top-level task. */
  parentWorkTaskId?: string | null;
  /** Saving as Done: close the task's open subtasks too ("Mark all as done"). */
  completeSubtasks?: boolean;
}
