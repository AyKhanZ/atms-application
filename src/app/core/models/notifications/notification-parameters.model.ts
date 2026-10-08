// snapshot from when the notification was written
export interface NotificationParametersModel {
  projectTitle: string | null;
  taskCode: string | null;
  taskTitle: string | null;
  // 1 task, 2 subtask
  taskKind: number | null;
  fromStatusId: number | null;
  toStatusId: number | null;
  // yyyy-MM-dd
  deadline: string | null;
}
