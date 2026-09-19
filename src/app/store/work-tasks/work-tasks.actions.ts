import { createAction, props } from '@ngrx/store';
import {
  CreateWorkTaskCommand,
  UpdateWorkTaskCommand,
  WorkTaskFilter,
  WorkTaskModel,
  WorkTaskPageModel,
} from '../../core/models/work-tasks';
import { WorkItemMutationError } from '../../core/models/work-items';

const key = '[work tasks]';

export const loadTasks = createAction(
  `${key} Load Tasks`,
  props<{ requestKey: string; projectId: string; filter: WorkTaskFilter; append: boolean }>(),
);
export const loadTasksSuccess = createAction(
  `${key} Load Tasks Success`,
  props<{ requestKey: string; append: boolean; page: WorkTaskPageModel }>(),
);
export const loadTasksFailure = createAction(
  `${key} Load Tasks Failure`,
  props<{ requestKey: string; error: string }>(),
);

export const loadTask = createAction(
  `${key} Load Task`,
  props<{ projectId: string; taskId: string }>(),
);
export const loadTaskSuccess = createAction(
  `${key} Load Task Success`,
  props<{ task: WorkTaskModel }>(),
);
export const loadTaskFailure = createAction(`${key} Load Task Failure`, props<{ error: string }>());

export const createTask = createAction(
  `${key} Create Task`,
  props<{ projectId: string; command: CreateWorkTaskCommand }>(),
);
export const createTaskSuccess = createAction(
  `${key} Create Task Success`,
  props<{ projectId: string; id: string }>(),
);
export const createTaskFailure = createAction(
  `${key} Create Task Failure`,
  props<{ error: WorkItemMutationError }>(),
);
export const updateTask = createAction(
  `${key} Update Task`,
  props<{ projectId: string; taskId: string; command: UpdateWorkTaskCommand }>(),
);
export const updateTaskSuccess = createAction(
  `${key} Update Task Success`,
  props<{ projectId: string; taskId: string }>(),
);
export const updateTaskFailure = createAction(
  `${key} Update Task Failure`,
  props<{ error: WorkItemMutationError }>(),
);
export const deleteTask = createAction(
  `${key} Delete Task`,
  props<{ projectId: string; taskId: string }>(),
);
export const deleteTaskSuccess = createAction(
  `${key} Delete Task Success`,
  props<{ projectId: string; taskId: string }>(),
);
export const deleteTaskFailure = createAction(
  `${key} Delete Task Failure`,
  props<{ error: WorkItemMutationError }>(),
);

/** The list is gone: drop its page and cancel a load still on its way. */
export const clearPage = createAction(`${key} Clear Page`, props<{ requestKey: string }>());
export const resetDetail = createAction(`${key} Reset Detail`);
export const reset = createAction(`${key} Reset`);
