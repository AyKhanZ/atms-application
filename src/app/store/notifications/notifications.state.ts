import { NotificationModel } from '../../core/models/notifications';

export interface NotificationPageState {
  unreadOnly: boolean;
  // newest first
  items: NotificationModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loaded: boolean;
  // first page
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
}

export interface NotificationsState {
  unreadCount: number;
  // read when the panel first opens, then kept fresh by pushes
  latest: NotificationModel[];
  latestLoaded: boolean;
  // only then a push rereads the newest ten
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
