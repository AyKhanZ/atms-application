/** Which files a list holds: a task's own, the subtasks' of a task, or a whole ticket's. */
export type AttachmentScope =
  | { kind: 'task'; workTaskId: string }
  | { kind: 'subtasks'; parentWorkTaskId: string }
  | { kind: 'ticket'; workTicketId: string };
