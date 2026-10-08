export type AttachmentScope =
  | { kind: 'task'; workTaskId: string }
  | { kind: 'subtasks'; parentWorkTaskId: string }
  | { kind: 'ticket'; workTicketId: string };
