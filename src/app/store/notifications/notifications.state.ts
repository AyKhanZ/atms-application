import { NotificationModel } from '../../core/models/notifications';

/** The Notifications page: one list, All or Unread, read by cursor. */
export interface NotificationPageState {
  unreadOnly: boolean;
  /** Newest first. */
  items: NotificationModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loaded: boolean;
  /** The first page. */
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
}

export interface NotificationsState {
  unreadCount: number;
  /** The bell's newest ten, read when the panel first opens and kept fresh by pushes after that. */
  latest: NotificationModel[];
  latestLoaded: boolean;
  /** The panel is on screen: only then a push reads the newest ten again. */
  latestOpen: boolean;
  latestLoading: boolean;
  latestError: string | null;
  page: NotificationPageState;
}

export const initialNotificationPageState: NotificationPageState = {
  unreadOnly: false,
  items: [],
  nextCursor: null,
  hasMore: false,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: null,
  loadMoreError: null,
};

export const initialNotificationsState: NotificationsState = {
  unreadCount: 0,
  latest: [],
  latestLoaded: false,
  latestOpen: false,
  latestLoading: false,
  latestError: null,
  page: initialNotificationPageState,
};
