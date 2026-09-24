import { type Action, createReducer, on } from '@ngrx/store';
import { WorkTaskModel } from '../../core/models/work-tasks';
import { WorkTaskStatus } from '../../core/enums/work-task-status.enum';
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

/** A subtask closed or reopened: its parent's progress, wherever the parent's card is shown. */
function countSubtask(state: TaskBoardState, task: WorkTaskModel, status: number): TaskBoardState {
  const parentId = task.parentWorkTask?.id;
  const wasDone = task.status.id === WorkTaskStatus.Done;
  const isDone = status === WorkTaskStatus.Done;
  if (!parentId || wasDone === isDone) return state;
  const step = isDone ? 1 : -1;
  const count = (item: WorkTaskModel): WorkTaskModel =>
    item.id === parentId ? { ...item, doneSubtaskCount: item.doneSubtaskCount + step } : item;
  const pages = Object.fromEntries(
    Object.entries(state.pages).map(([key, page]) => [
      key,
      { ...page, items: page.items.map(count) },
    ]),
  );
  return { ...state, pages };
}

/** A refused change: the two lists it touched are emptied, to be read again, rather than go on
 *  showing a move the server never made. */
function forget(state: TaskBoardState, keys: string[]): TaskBoardState {
  const pages = { ...state.pages };
  for (const key of keys) if (pages[key]) pages[key] = { ...pages[key], items: [] };
  return { ...state, pages };
}

/** An answer for a list the view has dropped meanwhile changes nothing: it must not come back. */
function answer(state: TaskBoardState, key: string, page: TaskBoardPageState): TaskBoardState {
  return key in state.pages ? { ...state, pages: { ...state.pages, [key]: page } } : state;
}

const reducer = createReducer(
  initialTaskBoardState,
  // A list being read again keeps what it shows until the answer comes: a refresh on returning to
  // the tab must not blank the board into skeletons for a moment. A refused move empties its two
  // lists first (below), so those do not go on showing it.
  on(
    Actions.loadPage,
    (state, { key }): TaskBoardState => ({
      ...state,
      pages: { ...state.pages, [key]: { ...pageOf(state, key), loading: true, error: null } },
    }),
  ),
  // Only the lists on screen are kept: every filter and order used to leave its own lists behind
  // for as long as the page stayed open.
  on(
    Actions.keepPages,
    (state, { keys }): TaskBoardState => ({
      ...state,
      pages: Object.fromEntries(Object.entries(state.pages).filter(([key]) => keys.includes(key))),
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
    (state, { key, append, page }): TaskBoardState =>
      answer(state, key, {
        items: append ? [...pageOf(state, key).items, ...page.items] : page.items,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        loading: false,
        error: null,
      }),
  ),
  on(
    Actions.loadAllSuccess,
    (state, { key, items, hasMore }): TaskBoardState =>
      answer(state, key, { items, nextCursor: null, hasMore, loading: false, error: null }),
  ),
  on(
    Actions.loadPageFailure,
    (state, { key, error }): TaskBoardState =>
      answer(state, key, { ...pageOf(state, key), loading: false, error }),
  ),
  on(Actions.loadCountsSuccess, (state, { counts }): TaskBoardState => ({ ...state, counts })),
  on(
    Actions.loadAssigneesSuccess,
    (state, { assignees }): TaskBoardState => ({ ...state, assignees }),
  ),
  on(
    Actions.moveTask,
    (state, { task, from, to, index, status }): TaskBoardState =>
      countSubtask(moveCard(state, task, { ...task, status }, from, to, index), task, status.id),
  ),
  on(
    Actions.moveTaskFailure,
    Actions.changeDeadlineFailure,
    (state, { from, to }): TaskBoardState => forget(state, [from, to]),
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
