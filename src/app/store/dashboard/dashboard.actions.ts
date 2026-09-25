import { createAction, props } from '@ngrx/store';
import { DictionaryModel } from '../../core/models/dictionary.model';
import {
  DashboardModel,
  DashboardProjectOptionModel,
  DashboardQuery,
} from '../../core/models/dashboard';

const key = '[dashboard]';

export const enter = createAction(`${key} Enter`, props<{ query: DashboardQuery }>());
export const leave = createAction(`${key} Leave`);
export const load = createAction(`${key} Load`, props<{ query: DashboardQuery }>());
export const refresh = createAction(`${key} Refresh`);
export const loadSuccess = createAction(
  `${key} Load Success`,
  props<{ query: DashboardQuery; model: DashboardModel }>(),
);
export const loadFailure = createAction(
  `${key} Load Failure`,
  props<{ query: DashboardQuery; error: string }>(),
);

export const loadProjects = createAction(`${key} Load Projects`);
export const loadProjectsSuccess = createAction(
  `${key} Load Projects Success`,
  props<{ options: DashboardProjectOptionModel[]; groupProjectIds: string[] }>(),
);
export const loadProjectsFailure = createAction(`${key} Load Projects Failure`);
export const searchProjects = createAction(`${key} Search Projects`, props<{ search: string }>());
export const searchProjectsSuccess = createAction(
  `${key} Search Projects Success`,
  props<{ options: DashboardProjectOptionModel[] }>(),
);
export const loadSelectedProject = createAction(
  `${key} Load Selected Project`,
  props<{ id: string }>(),
);
export const loadSelectedProjectSuccess = createAction(
  `${key} Load Selected Project Success`,
  props<{ option: DashboardProjectOptionModel }>(),
);
export const loadPriorities = createAction(`${key} Load Priorities`);
export const loadPrioritiesSuccess = createAction(
  `${key} Load Priorities Success`,
  props<{ priorities: DictionaryModel[] }>(),
);
