import { createAction, props } from '@ngrx/store';
import { BoardColumnModel } from '../../core/models/board-columns';

const key = '[board columns]';

export const load = createAction(`${key} Load`);
export const reload = createAction(`${key} Reload`);
export const loadSuccess = createAction(
  `${key} Load Success`,
  props<{ items: BoardColumnModel[] }>(),
);
export const loadFailure = createAction(`${key} Load Failure`, props<{ error: string }>());
