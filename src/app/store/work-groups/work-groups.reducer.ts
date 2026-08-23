import { type Action, createReducer, on } from '@ngrx/store';
import { WorkGroupModel } from '../../core/models/work-groups';
import * as Actions from './work-groups.actions';
import { initialWorkGroupsState, WorkGroupsState } from './work-groups.state';

const reducer = createReducer(
  initialWorkGroupsState,
  on(
    Actions.loadWorkGroups,
    (state, { projectId }): WorkGroupsState => ({
      ...state,
      projectId,
      isLoading: true,
      loadError: null,
    }),
  ),
  on(
    Actions.loadWorkGroupsSuccess,
    (state, { projectId, items }): WorkGroupsState =>
      state.projectId === projectId
        ? { ...state, items, isLoading: false, loadError: null }
        : state,
  ),
  on(
    Actions.loadWorkGroupsFailure,
    (state, { projectId, error }): WorkGroupsState =>
      state.projectId === projectId ? { ...state, isLoading: false, loadError: error } : state,
  ),
  on(
    Actions.createWorkGroup,
    Actions.updateWorkGroup,
    Actions.deleteWorkGroup,
    (state): WorkGroupsState => ({ ...state, isSaving: true }),
  ),
  on(
    Actions.createWorkGroupSuccess,
    Actions.updateWorkGroupSuccess,
    (state, { projectId }): WorkGroupsState =>
      state.projectId === projectId ? { ...state, isSaving: false } : state,
  ),
  on(
    Actions.deleteWorkGroupSuccess,
    (state, { projectId, workGroupId }): WorkGroupsState =>
      state.projectId === projectId
        ? {
            ...state,
            items: removeWorkGroup(state.items, workGroupId),
            isSaving: false,
          }
        : state,
  ),
  on(
    Actions.createWorkGroupFailure,
    Actions.updateWorkGroupFailure,
    Actions.deleteWorkGroupFailure,
    (state, { projectId }): WorkGroupsState =>
      state.projectId === projectId ? { ...state, isSaving: false } : state,
  ),
  on(Actions.resetWorkGroups, (): WorkGroupsState => initialWorkGroupsState),
);

export function workGroupsReducer(
  state: WorkGroupsState | undefined,
  action: Action,
): WorkGroupsState {
  return reducer(state, action);
}

function removeWorkGroup(items: WorkGroupModel[], workGroupId: string): WorkGroupModel[] {
  return items
    .filter((item) => item.id !== workGroupId)
    .map((item) => ({
      ...item,
      milestones: item.milestones.filter((milestone) => milestone.id !== workGroupId),
    }));
}
