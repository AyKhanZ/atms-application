import { HistoryAction } from '../../core/enums/history-action.enum';
import { HistoryEntityType } from '../../core/enums/history-entity-type.enum';
import { HistoryEntryModel, HistoryPageModel } from '../../core/models/history';
import { AuthStoreActions } from '../auth';
import * as Actions from './history.actions';
import { historyReducer } from './history.reducer';
import { initialHistoryState } from './history.state';

const entry = (id: string): HistoryEntryModel => ({
  id,
  entityType: HistoryEntityType.WorkTask,
  action: HistoryAction.Updated,
  createdAt: '2026-09-24T10:00:00Z',
  changes: [],
});

const page = (ids: string[], nextCursor: string | null = null): HistoryPageModel => ({
  items: ids.map(entry),
  nextCursor,
  hasMore: !!nextCursor,
  pageSize: 20,
});

const historyKey = 'task:t';
const scope = { kind: 'task', workTaskId: 't' } as const;

describe('historyReducer', () => {
  const loaded = historyReducer(
    initialHistoryState,
    Actions.loadSuccess({ historyKey, page: page(['a', 'b'], 'next'), states: [] }),
  );

  it('keeps the rows on screen while the tab reads them again', () => {
    const state = historyReducer(loaded, Actions.load({ historyKey, projectId: 'p', scope }));

    expect(state.lists[historyKey].loading).toBe(true);
    expect(state.lists[historyKey].items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('appends the next page without repeating an entry', () => {
    const state = historyReducer(
      historyReducer(
        loaded,
        Actions.loadMore({ historyKey, projectId: 'p', scope, cursor: 'next' }),
      ),
      Actions.loadMoreSuccess({ historyKey, page: page(['b', 'c']) }),
    );

    expect(state.lists[historyKey].items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(state.lists[historyKey].hasMore).toBe(false);
    expect(state.lists[historyKey].loadingMore).toBe(false);
  });

  it('keeps the loaded rows when the next page fails', () => {
    const state = historyReducer(loaded, Actions.loadMoreFailure({ historyKey, error: 'failed' }));

    expect(state.lists[historyKey].items).toHaveLength(2);
    expect(state.lists[historyKey].loadMoreError).toBe('failed');
  });

  it('drops the history when it leaves the screen', () => {
    expect(historyReducer(loaded, Actions.clear({ historyKey })).lists).toEqual({});
  });

  it('forgets everything on logout', () => {
    expect(historyReducer(loaded, AuthStoreActions.logoutCompleted())).toEqual(initialHistoryState);
  });
});
