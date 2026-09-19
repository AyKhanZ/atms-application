import { WorkItemKind } from '../../core/models/work-items';
import * as Actions from './global-search.actions';
import { globalSearchReducer } from './global-search.reducer';
import { initialGlobalSearchState } from './global-search.state';

describe('globalSearchReducer', () => {
  it('loads recent items quietly when the field opens', () => {
    const state = globalSearchReducer(initialGlobalSearchState, Actions.searchPopup({ query: '' }));

    expect(state.popupLoading).toBe(false);
    expect(state.popupQuery).toBe('');
  });

  it('shows loading only when the real search request starts', () => {
    const requested = globalSearchReducer(
      initialGlobalSearchState,
      Actions.searchPopup({ query: 'payment' }),
    );
    const started = globalSearchReducer(
      requested,
      Actions.searchPopupStarted({ query: 'payment' }),
    );

    expect(requested.popupLoading).toBe(false);
    expect(started.popupLoading).toBe(true);
  });

  it('ignores a late popup response for an older query', () => {
    const current = {
      ...initialGlobalSearchState,
      popupQuery: 'current',
      popupLoading: true,
    };
    const state = globalSearchReducer(
      current,
      Actions.searchPopupSuccess({
        query: 'old',
        result: { ...initialGlobalSearchState.popupResult },
      }),
    );

    expect(state).toBe(current);
  });

  it('appends another page for the same search', () => {
    const first = globalSearchReducer(
      initialGlobalSearchState,
      Actions.loadPage({ query: 'payment', itemType: WorkItemKind.Task, cursor: null }),
    );
    const firstLoaded = globalSearchReducer(
      first,
      Actions.loadPageSuccess({
        query: 'payment',
        itemType: WorkItemKind.Task,
        cursor: null,
        page: { items: [item('1')], nextCursor: 'next', hasMore: true, pageSize: 20 },
      }),
    );
    const loadingMore = globalSearchReducer(
      firstLoaded,
      Actions.loadPage({
        query: 'payment',
        itemType: WorkItemKind.Task,
        cursor: 'next',
      }),
    );
    const complete = globalSearchReducer(
      loadingMore,
      Actions.loadPageSuccess({
        query: 'payment',
        itemType: WorkItemKind.Task,
        cursor: 'next',
        page: { items: [item('2')], nextCursor: null, hasMore: false, pageSize: 20 },
      }),
    );

    expect(complete.page.items.map((value) => value.id)).toEqual(['1', '2']);
  });
});

function item(id: string) {
  return {
    itemType: WorkItemKind.Task,
    id,
    code: id,
    title: `Task ${id}`,
    project: { id: 'project', code: '1', name: 'Project' },
    status: { id: 1, code: 'New', name: 'New' },
  };
}
