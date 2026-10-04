/** What the sentence of a notification is made of, as it was when the notification was written. */
export interface NotificationParametersModel {
  projectTitle: string | null;
  taskCode: string | null;
  taskTitle: string | null;
  /** `WorkTaskKindEnum`: 1 task, 2 subtask. */
  taskKind: number | null;
  fromStatusId: number | null;
  toStatusId: number | null;
  /** `yyyy-MM-dd`. */
  deadline: string | null;
}
