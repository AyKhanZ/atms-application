import { type Action, createReducer, on } from '@ngrx/store';
import * as Actions from './work-projects.actions';
import { initialWorkProjectsState, WorkProjectsState } from './work-projects.state';

const reducer = createReducer(
  initialWorkProjectsState,
  on(
    Actions.loadProjects,
    (state, { filter }): WorkProjectsState => ({ ...state, filter, isLoading: true }),
  ),
  on(
    Actions.loadProjectsSuccess,
    (state, { response }): WorkProjectsState => ({
      ...state,
      items: response.items,
      totalCount: response.totalCount,
      isLoading: false,
    }),
  ),
  on(Actions.loadProjectsFailure, (state): WorkProjectsState => ({ ...state, isLoading: false })),
  on(Actions.loadProject, (state): WorkProjectsState => ({ ...state, isLoading: true })),
  on(
    Actions.loadProjectSuccess,
    (state, { item }): WorkProjectsState => ({ ...state, item, isLoading: false }),
  ),
  on(Actions.loadProjectFailure, (state): WorkProjectsState => ({ ...state, isLoading: false })),
  on(
    Actions.createProject,
    Actions.updateProject,
    Actions.updateProjectStatus,
    Actions.deleteProject,
    (state): WorkProjectsState => ({ ...state, isSubmitted: true }),
  ),
  on(
    Actions.createProjectSuccess,
    Actions.updateProjectSuccess,
    Actions.updateProjectStatusSuccess,
    (state): WorkProjectsState => ({ ...state, isSubmitted: false }),
  ),
  on(
    Actions.createProjectFailure,
    Actions.updateProjectFailure,
    Actions.updateProjectStatusFailure,
    Actions.deleteProjectFailure,
    (state): WorkProjectsState => ({ ...state, isSubmitted: false }),
  ),
  on(
    Actions.deleteProjectSuccess,
    (state, { id }): WorkProjectsState => ({
      ...state,
      items: state.items.filter((item) => item.id !== id),
      totalCount: Math.max(0, state.totalCount - 1),
      isSubmitted: false,
    }),
  ),
  on(Actions.clearItem, (state): WorkProjectsState => ({ ...state, item: null, isLoading: false })),
  on(Actions.clearAll, (): WorkProjectsState => initialWorkProjectsState),
);

export function workProjectsReducer(
  state: WorkProjectsState | undefined,
  action: Action,
): WorkProjectsState {
  return reducer(state, action);
}
