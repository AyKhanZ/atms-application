import { type Action, createReducer, on } from '@ngrx/store';
import { AuthStoreActions } from '../auth';
import * as Actions from './work-tasks.actions';
import { initialWorkTasksState, WorkTasksState } from './work-tasks.state';

const reducer = createReducer(
  initialWorkTasksState,
  on(
    Actions.loadTasks,
    (state, { requestKey, append }): WorkTasksState => ({
      ...state,
      pages: {
        ...state.pages,
        [requestKey]: {
          items: append ? (state.pages[requestKey]?.items ?? []) : [],
          nextCursor: append ? (state.pages[requestKey]?.nextCursor ?? null) : null,
          hasMore: append ? (state.pages[requestKey]?.hasMore ?? false) : false,
          loading: true,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadTasksSuccess,
    (state, { requestKey, append, page }): WorkTasksState => ({
      ...state,
      pages: {
        ...state.pages,
        [requestKey]: {
          items: append ? [...(state.pages[requestKey]?.items ?? []), ...page.items] : page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          loading: false,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadTasksFailure,
    (state, { requestKey, error }): WorkTasksState => ({
      ...state,
      pages: {
        ...state.pages,
        [requestKey]: {
          ...(state.pages[requestKey] ?? { items: [], nextCursor: null, hasMore: false }),
          loading: false,
          error,
        },
      },
    }),
  ),
  on(
    Actions.loadTask,
    (state): WorkTasksState => ({
      ...state,
      item: null,
      detailLoading: true,
      detailError: null,
    }),
  ),
  on(
    Actions.loadTaskSuccess,
    (state, { task }): WorkTasksState => ({ ...state, item: task, detailLoading: false }),
  ),
  on(
    Actions.loadTaskFailure,
    (state, { error }): WorkTasksState => ({
      ...state,
      detailLoading: false,
      detailError: error,
    }),
  ),
  on(
    Actions.createTask,
    Actions.updateTask,
    Actions.deleteTask,
    (state): WorkTasksState => ({ ...state, saving: true, mutationError: null }),
  ),
  on(
    Actions.createTaskSuccess,
    Actions.updateTaskSuccess,
    Actions.deleteTaskSuccess,
    (state): WorkTasksState => ({ ...state, saving: false }),
  ),
  on(
    Actions.createTaskFailure,
    Actions.updateTaskFailure,
    Actions.deleteTaskFailure,
    (state, { error }): WorkTasksState => ({ ...state, saving: false, mutationError: error }),
  ),
  on(Actions.clearPage, (state, { requestKey }): WorkTasksState => {
    const pages = { ...state.pages };
    delete pages[requestKey];
    return { ...state, pages };
  }),
  on(
    Actions.resetDetail,
    (state): WorkTasksState => ({
      ...state,
      item: null,
      detailLoading: false,
      detailError: null,
      saving: false,
      mutationError: null,
    }),
  ),
  on(Actions.reset, (): WorkTasksState => initialWorkTasksState),
  // Everything here is the signed-in user's; none of it may outlive the session.
  on(AuthStoreActions.logoutCompleted, (): WorkTasksState => initialWorkTasksState),
);

export function workTasksReducer(
  state: WorkTasksState | undefined,
  action: Action,
): WorkTasksState {
  return reducer(state, action);
}
