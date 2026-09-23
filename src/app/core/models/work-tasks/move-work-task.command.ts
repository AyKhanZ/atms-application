/** A card dropped on the board: its column and its place between two neighbours. */
export interface MoveWorkTaskCommand {
  statusId: number;
  /** The card right above the drop, if any. */
  previousWorkTaskId?: string | null;
  /** The card right below the drop, if any. */
  nextWorkTaskId?: string | null;
  /** Moving a task to Done: close its open subtasks too. */
  completeSubtasks?: boolean;
}
