import { createAction, props } from '@ngrx/store';
import { DictionaryModel } from '../../core/models/dictionary.model';
import {
  WorkTaskBoardAssigneeModel,
  WorkTaskBoardQuery,
  WorkTaskBoardOrder,
  WorkTaskDeadlineGroupModel,
} from '../../core/models/work-task-board';
import { WorkItemMutationError } from '../../core/models/work-items';
import { WorkTaskModel, WorkTaskPageModel } from '../../core/models/work-tasks';

const key = '[task board]';

// append adds under, otherwise replaces
export const loadPage = createAction(
  `${key} Load Page`,
  props<{
    key: string;
    query: WorkTaskBoardQuery;
    order: WorkTaskBoardOrder;
    pageSize: number;
    cursor: string | null;
  }>(),
);
export const loadPageSuccess = createAction(
  `${key} Load Page Success`,
  props<{ key: string; append: boolean; page: WorkTaskPageModel }>(),
);
export const loadPageFailure = createAction(
  `${key} Load Page Failure`,
  props<{ key: string; error: string }>(),
);

// every other list is dropped
export const keepPages = createAction(`${key} Keep Pages`, props<{ keys: string[] }>());

// calendar month in one request: counts per deadline and the first cards of each
export const loadCalendar = createAction(
  `${key} Load Calendar`,
  props<{ key: string; query: WorkTaskBoardQuery }>(),
);
export const loadCalendarSuccess = createAction(
  `${key} Load Calendar Success`,
  props<{ key: string; groups: WorkTaskDeadlineGroupModel[] }>(),
);

export const loadCounts = createAction(
  `${key} Load Counts`,
  props<{ query: WorkTaskBoardQuery }>(),
);
export const loadCountsSuccess = createAction(
  `${key} Load Counts Success`,
  props<{ counts: Record<number, number> }>(),
);

export const loadAssignees = createAction(
  `${key} Load Assignees`,
  props<{ projectIds: string[] }>(),
);

export const loadAssigneesSuccess = createAction(
  `${key} Load Assignees Success`,
  props<{ assignees: WorkTaskBoardAssigneeModel[] }>(),
);

// reducer moves it at once, the effect sends it; on failure the page reloads what moved
export const moveTask = createAction(
  `${key} Move Task`,
  props<{
    task: WorkTaskModel;
    from: string;
    to: string;
    index: number;
    status: DictionaryModel;
    boardColumn: DictionaryModel;
    previousWorkTaskId: string | null;
    nextWorkTaskId: string | null;
    completeSubtasks: boolean;
  }>(),
);
export const moveTaskSuccess = createAction(
  `${key} Move Task Success`,
  props<{ taskId: string; completeSubtasks: boolean }>(),
);
export const moveTaskFailure = createAction(
  `${key} Move Task Failure`,
  // lists the card left and went to, they no longer show the truth
  props<{ error: WorkItemMutationError; from: string; to: string }>(),
);

// same optimistic move as the board
export const changeDeadline = createAction(
  `${key} Change Deadline`,
  props<{ task: WorkTaskModel; from: string; to: string; deadline: string | null }>(),
);
export const changeDeadlineSuccess = createAction(
  `${key} Change Deadline Success`,
  props<{ taskId: string }>(),
);
export const changeDeadlineFailure = createAction(
  `${key} Change Deadline Failure`,
  // lists the card left and went to, they no longer show the truth
  props<{ error: WorkItemMutationError; from: string; to: string }>(),
);

export const reset = createAction(`${key} Reset`);
