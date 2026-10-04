import { createAction, props } from '@ngrx/store';
import { NotificationModel, NotificationPageModel } from '../../core/models/notifications';

const key = '[notifications]';

export const loadSummary = createAction(`${key} Load Summary`);
export const loadSummarySuccess = createAction(
  `${key} Load Summary Success`,
  props<{ unreadCount: number }>(),
);
export const loadSummaryFailure = createAction(`${key} Load Summary Failure`);

/** The bell's panel opened: its rows are read again and kept fresh while it stays open. */
export const panelOpened = createAction(`${key} Panel Opened`);
export const panelClosed = createAction(`${key} Panel Closed`);

export const loadLatest = createAction(`${key} Load Latest`);
export const loadLatestSuccess = createAction(
  `${key} Load Latest Success`,
  props<{ items: NotificationModel[] }>(),
);
export const loadLatestFailure = createAction(
  `${key} Load Latest Failure`,
  props<{ error: string }>(),
);

export const loadPage = createAction(`${key} Load Page`, props<{ unreadOnly: boolean }>());
export const loadPageSuccess = createAction(
  `${key} Load Page Success`,
  props<{ page: NotificationPageModel }>(),
);
export const loadPageFailure = createAction(`${key} Load Page Failure`, props<{ error: string }>());

export const loadMorePage = createAction(`${key} Load More Page`);
export const loadMorePageSuccess = createAction(
  `${key} Load More Page Success`,
  props<{ page: NotificationPageModel }>(),
);
export const loadMorePageFailure = createAction(
  `${key} Load More Page Failure`,
  props<{ error: string }>(),
);

/** The page left the screen: drop its list and cancel a read still on its way. */
export const resetPage = createAction(`${key} Reset Page`);

/** Read at once on screen; a failure reads the truth back from the server. */
export const markRead = createAction(`${key} Mark Read`, props<{ id: string }>());
export const markReadSuccess = createAction(`${key} Mark Read Success`, props<{ id: string }>());
export const markReadFailure = createAction(`${key} Mark Read Failure`, props<{ id: string }>());

export const markUnread = createAction(`${key} Mark Unread`, props<{ id: string }>());
export const markUnreadSuccess = createAction(
  `${key} Mark Unread Success`,
  props<{ id: string }>(),
);
export const markUnreadFailure = createAction(
  `${key} Mark Unread Failure`,
  props<{ id: string }>(),
);

export const markAllRead = createAction(`${key} Mark All Read`);
export const markAllReadSuccess = createAction(`${key} Mark All Read Success`);
export const markAllReadFailure = createAction(`${key} Mark All Read Failure`);

/** A new notification, or one merged into an unread one, known from its push. */
export const received = createAction(
  `${key} Received`,
  props<{ id: string; unreadCount: number }>(),
);
/** Something was read or made unread, here or in another tab. */
export const readElsewhere = createAction(
  `${key} Read Elsewhere`,
  props<{ unreadCount: number }>(),
);

export const reset = createAction(`${key} Reset`);
