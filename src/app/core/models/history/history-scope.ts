/** Whose history: a project with its groups and milestones, a ticket, or a task or subtask. */
export type HistoryScope =
  | { kind: 'project' }
  | { kind: 'ticket'; workTicketId: string }
  | { kind: 'task'; workTaskId: string };
