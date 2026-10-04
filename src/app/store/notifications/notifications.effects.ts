import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import {
  EMPTY,
  catchError,
  exhaustMap,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';
import {
  NOTIFICATIONS_LATEST_SIZE,
  NOTIFICATIONS_PAGE_SIZE,
  NotificationsService,
} from '../../core/services/notifications.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './notifications.actions';
import * as Selectors from './notifications.selectors';
import { NotificationPageState } from './notifications.state';

@Injectable()
export class NotificationsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationsService);
  private readonly realtime = inject(RealtimeService);
  private readonly snackBar = inject(SnackBarService);
  private readonly reset$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );
  private readonly pageGone$ = merge(this.reset$, this.actions$.pipe(ofType(ActionsStore.resetPage)));
  private readonly latestOpen$ = this.store.select(Selectors.getLatestOpen);
  private readonly page$ = this.store.select(Selectors.getPage);

  loadSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadSummary),
      switchMap(() =>
        this.notifications.getSummary().pipe(
          map(({ unreadCount }) => ActionsStore.loadSummarySuccess({ unreadCount })),
          // The bell stays as it was; the next push or reconnect brings the number.
          catchError(() => of(ActionsStore.loadSummaryFailure())),
          takeUntil(this.reset$),
        ),
      ),
    ),
  );

  /** Every opening reads the newest ten again; the rows already there stay until they arrive. */
  panelOpened$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.panelOpened),
      map(() => ActionsStore.loadLatest()),
    ),
  );

  loadLatest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadLatest),
      switchMap(() =>
        this.notifications.getNotifications({ pageSize: NOTIFICATIONS_LATEST_SIZE }).pipe(
          map(({ items }) => ActionsStore.loadLatestSuccess({ items })),
          catchError(() =>
            of(ActionsStore.loadLatestFailure({ error: "Couldn't load notifications." })),
          ),
          takeUntil(this.reset$),
        ),
      ),
    ),
  );

  loadPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadPage),
      switchMap(({ unreadOnly }) =>
        this.notifications.getNotifications({ pageSize: NOTIFICATIONS_PAGE_SIZE, unreadOnly }).pipe(
          map((page) => ActionsStore.loadPageSuccess({ page })),
          catchError(() =>
            of(ActionsStore.loadPageFailure({ error: "Couldn't load notifications." })),
          ),
          takeUntil(this.pageGone$),
        ),
      ),
    ),
  );

  loadMorePage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadMorePage),
      withLatestFrom(this.page$),
      exhaustMap(([, page]) =>
        !page.nextCursor
          ? EMPTY
          : this.notifications
              .getNotifications({
                pageSize: NOTIFICATIONS_PAGE_SIZE,
                unreadOnly: page.unreadOnly,
                cursor: page.nextCursor,
              })
              .pipe(
                map((next) => ActionsStore.loadMorePageSuccess({ page: next })),
                catchError(() =>
                  of(
                    ActionsStore.loadMorePageFailure({
                      error: "Couldn't load more notifications. Try again.",
                    }),
                  ),
                ),
                // A reload starts the list over; a later page of the old list would land on it.
                takeUntil(merge(this.pageGone$, this.actions$.pipe(ofType(ActionsStore.loadPage)))),
              ),
      ),
    ),
  );

  markRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.markRead),
      mergeMap(({ id }) =>
        this.notifications.markRead(id).pipe(
          map(() => ActionsStore.markReadSuccess({ id })),
          catchError(() => of(ActionsStore.markReadFailure({ id }))),
        ),
      ),
    ),
  );

  markUnread$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.markUnread),
      mergeMap(({ id }) =>
        this.notifications.markUnread(id).pipe(
          map(() => ActionsStore.markUnreadSuccess({ id })),
          catchError(() => of(ActionsStore.markUnreadFailure({ id }))),
        ),
      ),
    ),
  );

  markAllRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.markAllRead),
      switchMap(() =>
        this.notifications.markAllRead().pipe(
          map(() => ActionsStore.markAllReadSuccess()),
          catchError(() => of(ActionsStore.markAllReadFailure())),
        ),
      ),
    ),
  );

  /** What the screen already showed was not saved: say so and read the truth back. */
  markFailed$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ActionsStore.markReadFailure,
        ActionsStore.markUnreadFailure,
        ActionsStore.markAllReadFailure,
      ),
      tap(() => this.snackBar.error("Couldn't update notifications. Try again.")),
      withLatestFrom(this.latestOpen$, this.page$),
      mergeMap(([, latestOpen, page]) => [
        ActionsStore.loadSummary(),
        ...rereads(latestOpen, page, true),
      ]),
    ),
  );

  received$ = createEffect(() =>
    this.realtime.notificationCreated$.pipe(
      map(({ id, unreadCount }) => ActionsStore.received({ id, unreadCount })),
    ),
  );

  /** A new one goes on top of what is on screen: the panel while it is open, and the page. */
  refreshOnReceived$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.received),
      withLatestFrom(this.latestOpen$, this.page$),
      mergeMap(([, latestOpen, page]) => rereads(latestOpen, page, false)),
    ),
  );

  /**
   * A read in this tab comes back as a push with the number this tab already shows; only a read in
   * another tab changes it, and only then are the rows read again.
   */
  readElsewhere$ = createEffect(() =>
    this.realtime.notificationRead$.pipe(
      withLatestFrom(
        this.store.select(Selectors.getUnreadCount),
        this.latestOpen$,
        this.page$,
      ),
      mergeMap(([{ unreadCount }, shown, latestOpen, page]) => [
        ActionsStore.readElsewhere({ unreadCount }),
        ...(unreadCount !== shown ? rereads(latestOpen, page, false) : []),
      ]),
    ),
  );

  /** Pushes missed while the connection was down: the number and every list on screen again. */
  reconnected$ = createEffect(() =>
    this.realtime.reconnected$.pipe(
      withLatestFrom(this.latestOpen$, this.page$),
      mergeMap(([, latestOpen, page]) => [
        ActionsStore.loadSummary(),
        ...rereads(latestOpen, page, true),
      ]),
    ),
  );
}

/**
 * The lists to read again after a change. The page is read again only while it holds its first
 * page: after Load more, a reload would throw away what the person scrolled to — unless the screen
 * may be wrong (`always`), after a failure or a lost connection.
 */
function rereads(latestOpen: boolean, page: NotificationPageState, always: boolean): Action[] {
  const actions: Action[] = [];
  if (latestOpen) actions.push(ActionsStore.loadLatest());
  if (page.loaded && (always || page.items.length <= NOTIFICATIONS_PAGE_SIZE)) {
    actions.push(ActionsStore.loadPage({ unreadOnly: page.unreadOnly }));
  }
  return actions;
}
