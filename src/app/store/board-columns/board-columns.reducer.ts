import { Action, createReducer, on } from '@ngrx/store';
import { AuthStoreActions } from '../auth';
import * as Actions from './board-columns.actions';
import { BoardColumnsState, initialBoardColumnsState } from './board-columns.state';

const reducer = createReducer(
  initialBoardColumnsState,
  on(Actions.load, (state): BoardColumnsState => ({ ...state, loading: !state.loaded, error: null })),
  on(Actions.reload, (state): BoardColumnsState => ({ ...state, error: null })),
  on(
    Actions.loadSuccess,
    (state, { items }): BoardColumnsState => ({
      ...state,
      items,
      loaded: true,
      loading: false,
      error: null,
    }),
  ),
  on(
    Actions.loadFailure,
    (state, { error }): BoardColumnsState => ({ ...state, loading: false, error }),
  ),
  on(AuthStoreActions.logoutCompleted, (): BoardColumnsState => initialBoardColumnsState),
);

export function boardColumnsReducer(
  state: BoardColumnsState | undefined,
  action: Action,
): BoardColumnsState {
  return reducer(state, action);
}
