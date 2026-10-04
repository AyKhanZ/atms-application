import { NotificationModel } from '../../core/models/notifications';
import { AuthStoreActions } from '../auth';
import * as Actions from './notifications.actions';
import { notificationsReducer } from './notifications.reducer';
import { initialNotificationsState, NotificationsState } from './notifications.state';

const notification = (id: string, readAt: string | null = null): NotificationModel => ({
  id,
  type: 1,
  createdAt: '2026-10-02T09:00:00Z',
  readAt,
  actor: null,
  projectId: 'p',
  entityType: 2,
  entityId: 't',
  workTicketId: 'k',
  taskStatusId: 1,
  taskDeadline: null,
  commentId: null,
  parameters: {
    projectTitle: 'Project Alpha',
    taskCode: '41',
    taskTitle: 'Payment form',
    taskKind: 1,
    fromStatusId: null,
    toStatusId: null,
    deadline: null,
  },
  entityDeleted: false,
  commentDeleted: false,
});

const unreadIds = (state: NotificationsState) =>
  state.latest.filter((item) => !item.readAt).map((item) => item.id);

describe('notificationsReducer', () => {
  const loaded = notificationsReducer(
    { ...initialNotificationsState, unreadCount: 5 },
    Actions.loadLatestSuccess({
      items: [notification('a'), notification('b'), notification('c', '2026-10-01T00:00:00Z')],
    }),
  );

  it('takes the unread count from the summary and from every push', () => {
    let state = notificationsReducer(
      initialNotificationsState,
      Actions.loadSummarySuccess({ unreadCount: 3 }),
    );
    expect(state.unreadCount).toBe(3);

    state = notificationsReducer(state, Actions.received({ id: 'n', unreadCount: 4 }));
    expect(state.unreadCount).toBe(4);

    state = notificationsReducer(state, Actions.readElsewhere({ unreadCount: 1 }));
    expect(state.unreadCount).toBe(1);
  });

  it('knows whether the panel is open', () => {
    const opened = notificationsReducer(loaded, Actions.panelOpened());
    expect(opened.latestOpen).toBe(true);

    const closed = notificationsReducer(opened, Actions.panelClosed());
    expect(closed.latestOpen).toBe(false);
    // The rows stay for the next opening.
    expect(closed.latest).toHaveLength(3);
  });

  it('keeps the rows shown while it reads them again', () => {
    const state = notificationsReducer(loaded, Actions.loadLatest());

    expect(state.latest).toHaveLength(3);
    expect(state.latestLoading).toBe(true);
    expect(state.latestLoaded).toBe(true);
  });

  it('remembers a failed read without losing the rows', () => {
    const state = notificationsReducer(
      notificationsReducer(loaded, Actions.loadLatest()),
      Actions.loadLatestFailure({ error: "Couldn't load notifications." }),
    );

    expect(state.latestLoading).toBe(false);
    expect(state.latestError).toBe("Couldn't load notifications.");
    expect(state.latest).toHaveLength(3);
  });

  it('marks one read at once and counts it down', () => {
    const state = notificationsReducer(loaded, Actions.markRead({ id: 'a' }));

    expect(unreadIds(state)).toEqual(['b']);
    expect(state.unreadCount).toBe(4);
  });

  it('does not count down a read one, nor one it does not show', () => {
    let state = notificationsReducer(loaded, Actions.markRead({ id: 'c' }));
    expect(state.unreadCount).toBe(5);

    state = notificationsReducer(state, Actions.markRead({ id: 'older-than-the-panel' }));
    expect(state.unreadCount).toBe(5);
  });

  it('marks everything read and the count drops to zero', () => {
    const state = notificationsReducer(loaded, Actions.markAllRead());

    expect(unreadIds(state)).toEqual([]);
    expect(state.unreadCount).toBe(0);
    // The time of an earlier read stays as it was.
    expect(state.latest[2].readAt).toBe('2026-10-01T00:00:00Z');
  });

  describe('page', () => {
    const pageOf = (ids: string[], nextCursor: string | null = null) => ({
      items: ids.map((id) => notification(id)),
      nextCursor,
      hasMore: !!nextCursor,
      pageSize: 20,
    });
    const opened = notificationsReducer(loaded, Actions.loadPage({ unreadOnly: false }));
    const firstPage = notificationsReducer(
      opened,
      Actions.loadPageSuccess({ page: pageOf(['a', 'x'], 'next') }),
    );
    const pageIds = (state: NotificationsState) => state.page.items.map((item) => item.id);

    it('keeps the rows when the same filter is read again and drops them for the other one', () => {
      const same = notificationsReducer(firstPage, Actions.loadPage({ unreadOnly: false }));
      expect(pageIds(same)).toEqual(['a', 'x']);
      expect(same.page.loading).toBe(true);

      const other = notificationsReducer(firstPage, Actions.loadPage({ unreadOnly: true }));
      expect(pageIds(other)).toEqual([]);
      expect(other.page.unreadOnly).toBe(true);
    });

    it('adds the next page once, even when a row moved up came again', () => {
      const more = notificationsReducer(
        notificationsReducer(firstPage, Actions.loadMorePage()),
        Actions.loadMorePageSuccess({ page: pageOf(['x', 'y']) }),
      );

      expect(pageIds(more)).toEqual(['a', 'x', 'y']);
      expect(more.page.hasMore).toBe(false);
      expect(more.page.loadingMore).toBe(false);
    });

    it('shows a read on the bell and on the page at once and counts it once', () => {
      const state = notificationsReducer(firstPage, Actions.markRead({ id: 'a' }));

      expect(state.page.items[0].readAt).not.toBeNull();
      expect(state.latest[0].readAt).not.toBeNull();
      expect(state.unreadCount).toBe(4);
    });

    it('removes a read row from the Unread page but keeps it in the bell', () => {
      const unreadPage = notificationsReducer(
        notificationsReducer(loaded, Actions.loadPage({ unreadOnly: true })),
        Actions.loadPageSuccess({ page: pageOf(['a', 'x'], 'next') }),
      );

      const state = notificationsReducer(unreadPage, Actions.markRead({ id: 'a' }));

      expect(pageIds(state)).toEqual(['x']);
      expect(state.page.nextCursor).toBe('next');
      expect(state.latest[0].readAt).not.toBeNull();
    });

    it('clears the Unread page when everything is marked read', () => {
      const unreadPage = notificationsReducer(
        notificationsReducer(loaded, Actions.loadPage({ unreadOnly: true })),
        Actions.loadPageSuccess({ page: pageOf(['a', 'x'], 'next') }),
      );

      const state = notificationsReducer(unreadPage, Actions.markAllRead());

      expect(pageIds(state)).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.page.hasMore).toBe(false);
      expect(state.page.nextCursor).toBeNull();
    });

    it('counts a read of a row only on the page', () => {
      expect(notificationsReducer(firstPage, Actions.markRead({ id: 'x' })).unreadCount).toBe(4);
    });

    it('makes a read one unread again and counts it up', () => {
      const read = notificationsReducer(firstPage, Actions.markRead({ id: 'a' }));
      const unread = notificationsReducer(read, Actions.markUnread({ id: 'a' }));

      expect(unread.page.items[0].readAt).toBeNull();
      expect(unread.latest[0].readAt).toBeNull();
      expect(unread.unreadCount).toBe(5);
    });

    it('forgets the page when it is left, and keeps the bell', () => {
      const state = notificationsReducer(firstPage, Actions.resetPage());

      expect(state.page).toEqual(initialNotificationsState.page);
      expect(state.latest).toHaveLength(3);
    });
  });

  it('forgets everything on logout', () => {
    expect(notificationsReducer(loaded, AuthStoreActions.logoutCompleted())).toEqual(
      initialNotificationsState,
    );
    expect(notificationsReducer(loaded, Actions.reset())).toEqual(initialNotificationsState);
  });
});
