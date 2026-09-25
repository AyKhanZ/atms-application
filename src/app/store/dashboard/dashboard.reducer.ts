import { Action, createReducer, on } from '@ngrx/store';
import { AuthStoreActions } from '../auth';
import * as Actions from './dashboard.actions';
import { DashboardState, initialDashboardState } from './dashboard.state';

const reducer = createReducer(
  initialDashboardState,
  on(Actions.enter, (state, { query }): DashboardState => ({ ...state, active: true, query })),
  on(
    Actions.load,
    (state, { query }): DashboardState => ({
      ...state,
      query,
      model:
        state.query.projectId === query.projectId && state.query.period === query.period
          ? state.model
          : null,
      loading: true,
      error: null,
      selectedProject: state.query.projectId === query.projectId ? state.selectedProject : null,
    }),
  ),
  on(
    Actions.loadSuccess,
    (state, { query, model }): DashboardState =>
      state.active &&
      state.query.projectId === query.projectId &&
      state.query.period === query.period
        ? { ...state, model, loading: false, error: null }
        : state,
  ),
  on(
    Actions.loadFailure,
    (state, { query, error }): DashboardState =>
      state.active &&
      state.query.projectId === query.projectId &&
      state.query.period === query.period
        ? { ...state, loading: false, error }
        : state,
  ),
  on(
    Actions.loadProjectsSuccess,
    (state, { options, groupProjectIds }): DashboardState => ({
      ...state,
      projectOptions: options,
      groupProjectIds,
    }),
  ),
  on(
    Actions.searchProjectsSuccess,
    (state, { options }): DashboardState => ({
      ...state,
      projectOptions: options,
    }),
  ),
  on(
    Actions.loadSelectedProjectSuccess,
    (state, { option }): DashboardState =>
      state.query.projectId === option.id ? { ...state, selectedProject: option } : state,
  ),
  on(
    Actions.loadPrioritiesSuccess,
    (state, { priorities }): DashboardState => ({ ...state, priorities }),
  ),
  on(Actions.leave, AuthStoreActions.logoutCompleted, (): DashboardState => initialDashboardState),
);

export function dashboardReducer(
  state: DashboardState | undefined,
  action: Action,
): DashboardState {
  return reducer(state, action);
}
