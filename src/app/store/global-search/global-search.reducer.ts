import { type Action, createReducer, on } from '@ngrx/store';
import { AuthStoreActions } from '../auth';
import * as Actions from './global-search.actions';
import {
  GlobalSearchState,
  emptyGlobalSearchResult,
  initialGlobalSearchState,
} from './global-search.state';

const reducer = createReducer(
  initialGlobalSearchState,
  on(
    Actions.searchPopup,
    (state, { query }): GlobalSearchState => ({
      ...state,
      popupQuery: query,
      popupResult: emptyGlobalSearchResult,
      popupLoading: false,
      popupError: null,
    }),
  ),
  on(
    Actions.searchPopupStarted,
    (state, { query }): GlobalSearchState =>
      state.popupQuery === query ? { ...state, popupLoading: true } : state,
  ),
  on(
    Actions.searchPopupSuccess,
    (state, { query, result }): GlobalSearchState =>
      state.popupQuery === query
        ? {
            ...state,
            popupResult: result,
            popupLoading: false,
            popupError: null,
            popupRecent: query.trim() ? state.popupRecent : result.recent,
          }
        : state,
  ),
  on(
    Actions.searchPopupFailure,
    (state, { query, error }): GlobalSearchState =>
      state.popupQuery === query ? { ...state, popupLoading: false, popupError: error } : state,
  ),
  on(
    Actions.resetPopup,
    (state): GlobalSearchState => ({
      ...state,
      popupQuery: '',
      popupResult: emptyGlobalSearchResult,
      popupLoading: false,
      popupError: null,
      popupRecent: null,
    }),
  ),
  on(
    Actions.loadPage,
    (state, { query, itemType, cursor }): GlobalSearchState => ({
      ...state,
      page: {
        query,
        itemType,
        items: cursor ? state.page.items : [],
        nextCursor: cursor,
        hasMore: cursor ? state.page.hasMore : false,
        loading: query.trim().length > 0,
        error: null,
      },
    }),
  ),
  on(
    Actions.loadPageSuccess,
    (state, { query, itemType, cursor, page }): GlobalSearchState =>
      state.page.query === query && state.page.itemType === itemType
        ? {
            ...state,
            page: {
              ...state.page,
              items: cursor ? [...state.page.items, ...page.items] : page.items,
              nextCursor: page.nextCursor,
              hasMore: page.hasMore,
              loading: false,
              error: null,
            },
          }
        : state,
  ),
  on(
    Actions.loadPageFailure,
    (state, { query, itemType, error }): GlobalSearchState =>
      state.page.query === query && state.page.itemType === itemType
        ? { ...state, page: { ...state.page, loading: false, error } }
        : state,
  ),
  on(
    Actions.resetPage,
    (state): GlobalSearchState => ({ ...state, page: initialGlobalSearchState.page }),
  ),
  // Results and recent items are the signed-in user's; none of them may outlive the session.
  on(AuthStoreActions.logoutCompleted, (): GlobalSearchState => initialGlobalSearchState),
);

export function globalSearchReducer(
  state: GlobalSearchState | undefined,
  action: Action,
): GlobalSearchState {
  return reducer(state, action);
}
