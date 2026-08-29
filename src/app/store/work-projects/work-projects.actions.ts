import { createAction, props } from '@ngrx/store';
import { PaginatedResponse } from '../../core/models/paginated.model';
import {
  CreateWorkProjectCommand,
  UpdateWorkProjectCommand,
  WorkProjectItemModel,
  WorkProjectListFilter,
  WorkProjectModel,
} from '../../core/models/work-projects';

const key = '[work projects]';

export const loadProjects = createAction(`${key} Load`, props<{ filter: WorkProjectListFilter }>());

export const loadProjectsSuccess = createAction(`${key} Load Success`, props<{ response: PaginatedResponse<WorkProjectItemModel> }>());

export const loadProjectsFailure = createAction(`${key} Load Failure`);

export const loadProject = createAction(`${key} Load One`, props<{ id: string }>());

export const loadProjectSuccess = createAction(`${key} Load One Success`, props<{ item: WorkProjectModel }>());

export const loadProjectFailure = createAction(`${key} Load One Failure`);


export const createProject = createAction(`${key} Create`, props<{ command: CreateWorkProjectCommand }>());

export const createProjectSuccess = createAction(`${key} Create Success`, props<{ id: string }>());

export const createProjectFailure = createAction(`${key} Create Failure`);


export const updateProject = createAction(`${key} Update`, props<{ command: UpdateWorkProjectCommand }>());

export const updateProjectSuccess = createAction(`${key} Update Success`, props<{ id: string }>());

export const updateProjectFailure = createAction(`${key} Update Failure`);

export const updateProjectStatus = createAction(`${key} Update Status`, props<{ id: string; projectStatusId: number }>());

export const updateProjectStatusSuccess = createAction(`${key} Update Status Success`, props<{ id: string; projectStatusId: number }>());

export const updateProjectStatusFailure = createAction(`${key} Update Status Failure`);


export const addProjectParticipant = createAction(
  `${key} Add Participant`,
  props<{ id: string; userId: string; roleId: string }>(),
);

export const addProjectParticipantSuccess = createAction(`${key} Add Participant Success`, props<{ id: string }>());

export const addProjectParticipantFailure = createAction(`${key} Add Participant Failure`);

export const updateProjectParticipant = createAction(
  `${key} Update Participant`,
  props<{ id: string; participantId: string; roleId: string }>(),
);

export const updateProjectParticipantSuccess = createAction(`${key} Update Participant Success`, props<{ id: string }>());

export const updateProjectParticipantFailure = createAction(`${key} Update Participant Failure`);

export const deleteProjectParticipant = createAction(
  `${key} Delete Participant`,
  props<{ id: string; participantId: string }>(),
);

export const deleteProjectParticipantSuccess = createAction(`${key} Delete Participant Success`, props<{ id: string }>());

export const deleteProjectParticipantFailure = createAction(`${key} Delete Participant Failure`);


export const deleteProject = createAction(`${key} Delete`, props<{ id: string }>());

export const deleteProjectSuccess = createAction(`${key} Delete Success`, props<{ id: string }>());

export const deleteProjectFailure = createAction(`${key} Delete Failure`);


export const clearItem = createAction(`${key} Clear Item`);

export const clearAll = createAction(`${key} Clear All`);
