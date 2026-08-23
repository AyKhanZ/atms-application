import { createAction, props } from '@ngrx/store';
import {
  CreateWorkGroupCommand,
  UpdateWorkGroupCommand,
  WorkGroupKind,
  WorkGroupModel,
} from '../../core/models/work-groups';

const key = '[work groups]';

export const loadWorkGroups = createAction(`${key} Load`, props<{ projectId: string }>());

export const loadWorkGroupsSuccess = createAction(
  `${key} Load Success`,
  props<{ projectId: string; items: WorkGroupModel[] }>(),
);

export const loadWorkGroupsFailure = createAction(
  `${key} Load Failure`,
  props<{ projectId: string; error: string }>(),
);

export const createWorkGroup = createAction(
  `${key} Create`,
  props<{ projectId: string; kind: WorkGroupKind; command: CreateWorkGroupCommand }>(),
);

export const createWorkGroupSuccess = createAction(
  `${key} Create Success`,
  props<{
    projectId: string;
    id: string;
    kind: WorkGroupKind;
    parentWorkGroupId: string | null;
  }>(),
);

export const createWorkGroupFailure = createAction(
  `${key} Create Failure`,
  props<{ projectId: string; kind: WorkGroupKind; error: string }>(),
);

export const updateWorkGroup = createAction(
  `${key} Update`,
  props<{
    projectId: string;
    workGroupId: string;
    kind: WorkGroupKind;
    command: UpdateWorkGroupCommand;
  }>(),
);

export const updateWorkGroupSuccess = createAction(
  `${key} Update Success`,
  props<{ projectId: string; workGroupId: string; kind: WorkGroupKind }>(),
);

export const updateWorkGroupFailure = createAction(
  `${key} Update Failure`,
  props<{ projectId: string; kind: WorkGroupKind; error: string }>(),
);

export const deleteWorkGroup = createAction(
  `${key} Delete`,
  props<{ projectId: string; workGroupId: string; kind: WorkGroupKind }>(),
);

export const deleteWorkGroupSuccess = createAction(
  `${key} Delete Success`,
  props<{ projectId: string; workGroupId: string; kind: WorkGroupKind }>(),
);

export const deleteWorkGroupFailure = createAction(
  `${key} Delete Failure`,
  props<{ projectId: string; kind: WorkGroupKind; error: string }>(),
);

export const resetWorkGroups = createAction(`${key} Reset`);
