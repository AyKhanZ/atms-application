import { createAction, props } from '@ngrx/store';
import { DictionaryModel } from '../../core/models/dictionary.model';
import {
  WorkTaskBoardAssigneeModel,
  WorkTaskBoardQuery,
  WorkTaskBoardOrder,
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

// follows the cursor, for a calendar month
export const loadAll = createAction(
  `${key} Load All`,
  props<{ key: string; query: WorkTaskBoardQuery; order: WorkTaskBoardOrder }>(),
);
export const loadAllSuccess = createAction(
  `${key} Load All Success`,
  // true = the month was cut at the limit
  props<{ key: string; items: WorkTaskModel[]; hasMore: boolean }>(),
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
