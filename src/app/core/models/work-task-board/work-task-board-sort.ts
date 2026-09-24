import { SortDirectionEnum } from '../../enums/sort-direction.enum';

/** What the Tasks page orders by. The numbers match the server's `WorkTaskBoardSortEnum`. */
export enum WorkTaskBoardSort {
  /** The board's own order — what people set by dragging. */
  Rank = 1,
  /** When the task was closed. The Done column. */
  DoneAt = 2,
  /** The deadline; tasks without one stay last either way. */
  Deadline = 3,
  /** The priority. */
  Priority = 4,
  Title = 5,
  State = 6,
  Code = 7,
}

/** An order is a column plus a direction, the same pair the other lists send. */
export interface WorkTaskBoardOrder {
  sort: WorkTaskBoardSort;
  direction: SortDirectionEnum;
}

/** The board's manual order: what dragging a card sets. */
export const boardOrder: WorkTaskBoardOrder = {
  sort: WorkTaskBoardSort.Rank,
  direction: SortDirectionEnum.Asc,
};

/** The Done column: freshly closed first. */
export const doneOrder: WorkTaskBoardOrder = {
  sort: WorkTaskBoardSort.DoneAt,
  direction: SortDirectionEnum.Desc,
};

/** The calendar: the month read from its earliest deadline. */
export const deadlineOrder: WorkTaskBoardOrder = {
  sort: WorkTaskBoardSort.Deadline,
  direction: SortDirectionEnum.Asc,
};

/** Text for a store key, so two different orders never share one list. */
export function orderKey(order: WorkTaskBoardOrder): string {
  return `${order.sort}.${order.direction}`;
}
