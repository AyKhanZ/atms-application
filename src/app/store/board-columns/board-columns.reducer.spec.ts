import { WorkTaskStatus } from '../../core/enums/work-task-status.enum';
import { BoardColumnModel } from '../../core/models/board-columns';
import { AuthStoreActions } from '../auth';
import * as Actions from './board-columns.actions';
import { boardColumnsReducer } from './board-columns.reducer';
import { initialBoardColumnsState } from './board-columns.state';

const column: BoardColumnModel = {
  id: 4,
  code: 'InProgressDone',
  name: 'Done',
  label: 'In Progress · Done',
  category: WorkTaskStatus.InProgress,
  order: 3,
};

describe('boardColumnsReducer', () => {
  it('keeps the columns the server sent, in its order', () => {
    const loading = boardColumnsReducer(initialBoardColumnsState, Actions.load());
    expect(loading.loading).toBe(true);

    const state = boardColumnsReducer(loading, Actions.loadSuccess({ items: [column] }));

    expect(state.items).toEqual([column]);
    expect(state.loaded).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('does not show a spinner again when the columns are already there', () => {
    const loaded = boardColumnsReducer(initialBoardColumnsState, Actions.loadSuccess({ items: [column] }));

    expect(boardColumnsReducer(loaded, Actions.load()).loading).toBe(false);
  });

  it('keeps the error of a failed read', () => {
    const state = boardColumnsReducer(initialBoardColumnsState, Actions.loadFailure({ error: 'Failed' }));

    expect(state.error).toBe('Failed');
    expect(state.loading).toBe(false);
  });

  it('forgets the columns on sign-out', () => {
    const loaded = boardColumnsReducer(initialBoardColumnsState, Actions.loadSuccess({ items: [column] }));

    expect(boardColumnsReducer(loaded, AuthStoreActions.logoutCompleted())).toEqual(initialBoardColumnsState);
  });
});
