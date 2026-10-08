export type HistoryScope =
  | { kind: 'project' }
  | { kind: 'ticket'; workTicketId: string }
  | { kind: 'task'; workTaskId: string };
