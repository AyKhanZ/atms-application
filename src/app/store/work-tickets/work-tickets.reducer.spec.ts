import { AuthStoreActions } from '../auth';
import * as Actions from './work-tickets.actions';
import { workTicketsReducer } from './work-tickets.reducer';
import { initialWorkTicketsState } from './work-tickets.state';

describe('workTicketsReducer', () => {
  it('keeps independent milestone pages', () => {
    const first = workTicketsReducer(
      initialWorkTicketsState,
      Actions.loadTicketsSuccess({
        requestKey: 'milestone-1',
        append: false,
        page: { items: [], nextCursor: null, hasMore: false, pageSize: 10 },
      }),
    );
    const second = workTicketsReducer(
      first,
      Actions.loadTicketsSuccess({
        requestKey: 'milestone-2',
        append: false,
        page: { items: [], nextCursor: 'next', hasMore: true, pageSize: 10 },
      }),
    );

    expect(Object.keys(second.pages)).toEqual(['milestone-1', 'milestone-2']);
    expect(second.pages['milestone-2'].hasMore).toBe(true);
  });

  it('removes only the requested page', () => {
    const state = workTicketsReducer(
      {
        ...initialWorkTicketsState,
        pages: {
          first: { items: [], nextCursor: null, hasMore: false, loading: false, error: null },
          second: { items: [], nextCursor: null, hasMore: false, loading: false, error: null },
        },
      },
      Actions.clearPage({ requestKey: 'first' }),
    );

    expect(state.pages['first']).toBeUndefined();
    expect(state.pages['second']).toBeDefined();
  });

  it('forgets every list when the session ends', () => {
    const state = workTicketsReducer(
      initialWorkTicketsState,
      Actions.loadTickets({
        requestKey: 'first',
        projectId: 'p',
        filter: {},
        append: false,
      }),
    );

    expect(workTicketsReducer(state, AuthStoreActions.logoutCompleted())).toEqual(
      initialWorkTicketsState,
    );
  });
});
