export interface WorkTaskFilter {
  cursor?: string | null;
  pageSize?: number;
  workTicketId?: string | null;
  parentWorkTaskId?: string | null;
  rootTasksOnly?: boolean;
}
