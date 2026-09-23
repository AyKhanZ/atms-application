import { type Action, createReducer, on } from '@ngrx/store';
import { WorkTaskModel } from '../../core/models/work-tasks';
import { AuthStoreActions } from '../auth';
import * as Actions from './task-board.actions';
import {
  TaskBoardPageState,
  TaskBoardState,
  emptyTaskBoardPage,
  initialTaskBoardState,
} from './task-board.state';

const pageOf = (state: TaskBoardState, key: string): TaskBoardPageState =>
  state.pages[key] ?? emptyTaskBoardPage;

/** Takes the card out of `from` and puts the updated one into `to` at `index`. */
function moveCard(
  state: TaskBoardState,
  task: WorkTaskModel,
  updated: WorkTaskModel,
  from: string,
  to: string,
  index: number,
): TaskBoardState {
  const source = pageOf(state, from);
  const pages = {
    ...state.pages,
    [from]: { ...source, items: source.items.filter((item) => item.id !== task.id) },
  };
  const target = pages[to] ?? emptyTaskBoardPage;
  const items = target.items.filter((item) => item.id !== task.id);
  items.splice(Math.max(0, Math.min(index, items.length)), 0, updated);
  pages[to] = { ...target, items };
  return { ...state, pages };
}

const reducer = createReducer(
  initialTaskBoardState,
  on(
    Actions.loadPage,
    (state, { key, cursor }): TaskBoardState => ({
      ...state,
      pages: {
        ...state.pages,
        [key]: {
          ...(cursor ? pageOf(state, key) : emptyTaskBoardPage),
          loading: true,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadAll,
    (state, { key }): TaskBoardState => ({
      ...state,
      pages: { ...state.pages, [key]: { ...pageOf(state, key), loading: true, error: null } },
    }),
  ),
  on(
    Actions.loadPageSuccess,
    (state, { key, append, page }): TaskBoardState => ({
      ...state,
      pages: {
        ...state.pages,
        [key]: {
          items: append ? [...pageOf(state, key).items, ...page.items] : page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          loading: false,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadAllSuccess,
    (state, { key, items }): TaskBoardState => ({
      ...state,
      pages: {
        ...state.pages,
        [key]: { items, nextCursor: null, hasMore: false, loading: false, error: null },
      },
    }),
  ),
  on(
    Actions.loadPageFailure,
    (state, { key, error }): TaskBoardState => ({
      ...state,
      pages: { ...state.pages, [key]: { ...pageOf(state, key), loading: false, error } },
    }),
  ),
  on(Actions.loadCountsSuccess, (state, { counts }): TaskBoardState => ({ ...state, counts })),
  on(
    Actions.loadAssigneesSuccess,
    (state, { assignees }): TaskBoardState => ({ ...state, assignees }),
  ),
  on(
    Actions.moveTask,
    (state, { task, from, to, index, status }): TaskBoardState =>
      moveCard(state, task, { ...task, status }, from, to, index),
  ),
  on(Actions.changeDeadline, (state, { task, from, to, deadline }): TaskBoardState => {
    const target = pageOf(state, to);
    return moveCard(state, task, { ...task, deadline }, from, to, target.items.length);
  }),
  on(Actions.reset, (): TaskBoardState => initialTaskBoardState),
  // Everything here is the signed-in user's; none of it may outlive the session.
  on(AuthStoreActions.logoutCompleted, (): TaskBoardState => initialTaskBoardState),
);

export function taskBoardReducer(
  state: TaskBoardState | undefined,
  action: Action,
): TaskBoardState {
  return reducer(state, action);
}
