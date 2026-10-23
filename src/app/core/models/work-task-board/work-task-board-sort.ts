import { SortDirectionEnum } from '../../enums/sort-direction.enum';

// same numbers as server WorkTaskBoardSortEnum
export enum WorkTaskBoardSort {
  // what dragging sets
  Rank = 1,
  // Done column
  DoneAt = 2,
  // tasks without deadline stay last
  Deadline = 3,
  Priority = 4,
  Title = 5,
  State = 6,
  Code = 7,
}

export interface WorkTaskBoardOrder {
  sort: WorkTaskBoardSort;
  direction: SortDirectionEnum;
}

export const boardOrder: WorkTaskBoardOrder = {
  sort: WorkTaskBoardSort.Rank,
  direction: SortDirectionEnum.Asc,
};

// newest closed first
export const doneOrder: WorkTaskBoardOrder = {
  sort: WorkTaskBoardSort.DoneAt,
  direction: SortDirectionEnum.Desc,
};

// the rest of a calendar day: New, In Progress, Done, the order the month summary takes its first cards in
export const calendarDayOrder: WorkTaskBoardOrder = {
  sort: WorkTaskBoardSort.State,
  direction: SortDirectionEnum.Asc,
};

// store key, so two orders never share one list
export function orderKey(order: WorkTaskBoardOrder): string {
  return `${order.sort}.${order.direction}`;
}
