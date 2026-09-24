import { type Action, createReducer, on } from '@ngrx/store';
import { AuthStoreActions } from '../auth';
import * as Actions from './history.actions';
import { HistoryListState, HistoryState, initialHistoryState } from './history.state';

const emptyList: HistoryListState = {
  items: [],
  nextCursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  loadMoreError: null,
  states: null,
};

function update(
  state: HistoryState,
  historyKey: string,
  change: (list: HistoryListState) => HistoryListState,
): HistoryState {
  return {
    ...state,
    lists: { ...state.lists, [historyKey]: change(state.lists[historyKey] ?? emptyList) },
  };
}

const reducer = createReducer(
  initialHistoryState,
  // Opening the tab again keeps the rows already shown: the list is almost certainly the same, and
  // a skeleton over it would only flash.
  on(
    Actions.load,
    (state, { historyKey }): HistoryState =>
      update(state, historyKey, (list) => ({ ...list, loading: true, error: null })),
  ),
  on(
    Actions.loadSuccess,
    (state, { historyKey, page, states }): HistoryState =>
      update(state, historyKey, () => ({
        ...emptyList,
        items: page.items,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        states,
      })),
  ),
  on(
    Actions.loadFailure,
    (state, { historyKey, error }): HistoryState =>
      update(state, historyKey, (list) => ({ ...list, loading: false, error })),
  ),
  on(
    Actions.loadMore,
    (state, { historyKey }): HistoryState =>
      update(state, historyKey, (list) => ({ ...list, loadingMore: true, loadMoreError: null })),
  ),
  on(
    Actions.loadMoreSuccess,
    (state, { historyKey, page }): HistoryState =>
      update(state, historyKey, (list) => ({
        ...list,
        items: [
          ...list.items,
          ...page.items.filter((item) => !list.items.some((known) => known.id === item.id)),
        ],
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        loadingMore: false,
      })),
  ),
  on(
    Actions.loadMoreFailure,
    (state, { historyKey, error }): HistoryState =>
      update(state, historyKey, (list) => ({ ...list, loadingMore: false, loadMoreError: error })),
  ),
  on(Actions.clear, (state, { historyKey }): HistoryState => {
    const lists = { ...state.lists };
    delete lists[historyKey];
    return { ...state, lists };
  }),
  on(Actions.reset, (): HistoryState => initialHistoryState),
  on(AuthStoreActions.logoutCompleted, (): HistoryState => initialHistoryState),
);

export function historyReducer(state: HistoryState | undefined, action: Action): HistoryState {
  return reducer(state, action);
}
