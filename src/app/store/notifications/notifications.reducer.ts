import { type Action, createReducer, on } from '@ngrx/store';
import { NotificationModel } from '../../core/models/notifications';
import { AuthStoreActions } from '../auth';
import * as Actions from './notifications.actions';
import {
  initialNotificationPageState,
  initialNotificationsState,
  NotificationPageState,
  NotificationsState,
} from './notifications.state';

type ReadChange = (item: NotificationModel) => NotificationModel;

/**
 * The bell and the page can show the same notification: a read on one shows on the other at once.
 */
function changeEverywhere(state: NotificationsState, change: ReadChange): NotificationsState {
  const items = state.page.items.map(change);
  return {
    ...state,
    latest: state.latest.map(change),
    page: {
      ...state.page,
      items: state.page.unreadOnly ? items.filter((item) => !item.readAt) : items,
    },
  };
}

function isShown(state: NotificationsState, id: string, read: boolean): boolean {
  return [...state.latest, ...state.page.items].some(
    (item) => item.id === id && !!item.readAt === read,
  );
}

function updatePage(
  state: NotificationsState,
  change: Partial<NotificationPageState>,
): NotificationsState {
  return { ...state, page: { ...state.page, ...change } };
}

const reducer = createReducer(
  initialNotificationsState,
  on(
    Actions.loadSummarySuccess,
    Actions.received,
    Actions.readElsewhere,
    (state, { unreadCount }): NotificationsState => ({ ...state, unreadCount }),
  ),
  on(Actions.panelOpened, (state): NotificationsState => ({ ...state, latestOpen: true })),
  on(Actions.panelClosed, (state): NotificationsState => ({ ...state, latestOpen: false })),
  // Opening the panel again keeps the rows already shown; a skeleton over them would only flash.
  on(
    Actions.loadLatest,
    (state): NotificationsState => ({ ...state, latestLoading: true, latestError: null }),
  ),
  on(
    Actions.loadLatestSuccess,
    (state, { items }): NotificationsState => ({
      ...state,
      latest: items,
      latestLoaded: true,
      latestLoading: false,
    }),
  ),
  on(
    Actions.loadLatestFailure,
    (state, { error }): NotificationsState => ({
      ...state,
      latestLoading: false,
      latestError: error,
    }),
  ),
  // Another filter is another list: its rows are not kept. The same filter read again keeps them.
  on(
    Actions.loadPage,
    (state, { unreadOnly }): NotificationsState =>
      updatePage(state, {
        ...(state.page.unreadOnly === unreadOnly ? {} : initialNotificationPageState),
        unreadOnly,
        loading: true,
        loadingMore: false,
        error: null,
        loadMoreError: null,
      }),
  ),
  on(
    Actions.loadPageSuccess,
    (state, { page }): NotificationsState =>
      updatePage(state, {
        items: page.items,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        loaded: true,
        loading: false,
      }),
  ),
  on(
    Actions.loadPageFailure,
    (state, { error }): NotificationsState => updatePage(state, { loading: false, error }),
  ),
  on(
    Actions.loadMorePage,
    (state): NotificationsState => updatePage(state, { loadingMore: true, loadMoreError: null }),
  ),
  on(Actions.loadMorePageSuccess, (state, { page }): NotificationsState => {
    // A row merged and moved up in the meantime can come again on a later page: keep it once.
    const shown = new Set(state.page.items.map((item) => item.id));
    return updatePage(state, {
      items: [...state.page.items, ...page.items.filter((item) => !shown.has(item.id))],
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      loadingMore: false,
    });
  }),
  on(
    Actions.loadMorePageFailure,
    (state, { error }): NotificationsState =>
      updatePage(state, { loadingMore: false, loadMoreError: error }),
  ),
  on(
    Actions.resetPage,
    (state): NotificationsState => ({ ...state, page: initialNotificationPageState }),
  ),
  on(Actions.markRead, (state, { id }): NotificationsState => {
    // Not on screen, or read already: the count is the server's to tell.
    const unreadCount = isShown(state, id, false)
      ? Math.max(0, state.unreadCount - 1)
      : state.unreadCount;
    const now = new Date().toISOString();
    return {
      ...changeEverywhere(state, (item) =>
        item.id === id && !item.readAt ? { ...item, readAt: now } : item,
      ),
      unreadCount,
    };
  }),
  on(Actions.markUnread, (state, { id }): NotificationsState => {
    const unreadCount = isShown(state, id, true) ? state.unreadCount + 1 : state.unreadCount;
    return {
      ...changeEverywhere(state, (item) => (item.id === id ? { ...item, readAt: null } : item)),
      unreadCount,
    };
  }),
  on(Actions.markAllRead, (state): NotificationsState => {
    const now = new Date().toISOString();
    const changed = changeEverywhere(state, (item) =>
      item.readAt ? item : { ...item, readAt: now },
    );
    return {
      ...changed,
      page: changed.page.unreadOnly
        ? { ...changed.page, nextCursor: null, hasMore: false }
        : changed.page,
      unreadCount: 0,
    };
  }),
  on(Actions.reset, (): NotificationsState => initialNotificationsState),
  on(AuthStoreActions.logoutCompleted, (): NotificationsState => initialNotificationsState),
);

export function notificationsReducer(
  state: NotificationsState | undefined,
  action: Action,
): NotificationsState {
  return reducer(state, action);
}
