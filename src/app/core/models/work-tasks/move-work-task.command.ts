export interface MoveWorkTaskCommand {
  boardColumnId: number;
  previousWorkTaskId?: string | null;
  nextWorkTaskId?: string | null;
  // moving to Done closes open subtasks too
  completeSubtasks?: boolean;
}
