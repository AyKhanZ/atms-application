import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { NotificationModel } from '../../core/models/notifications';
import { NotificationCreatedEvent } from '../../core/models/realtime/notification-created.event';
import { NotificationReadEvent } from '../../core/models/realtime/notification-read.event';
import { NotificationsService } from '../../core/services/notifications.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { AuthStoreActions } from '../auth';
import * as Actions from './notifications.actions';
import { NotificationsEffects } from './notifications.effects';
import { initialNotificationsState, NotificationsState } from './notifications.state';

type EffectName = {
  [K in keyof NotificationsEffects]: NotificationsEffects[K] extends Observable<Action> ? K : never;
}[keyof NotificationsEffects];

describe('NotificationsEffects', () => {
  let actions: Subject<Action>;
  let created: Subject<NotificationCreatedEvent>;
  let read: Subject<NotificationReadEvent>;
  let reconnected: Subject<void>;
  let store: MockStore;
  let effects: NotificationsEffects;
  let snackBar: { error: ReturnType<typeof vi.fn> };
  let service: {
    getSummary: ReturnType<typeof vi.fn>;
    getNotifications: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    markUnread: ReturnType<typeof vi.fn>;
    markAllRead: ReturnType<typeof vi.fn>;
  };

  const notification = (id: string): NotificationModel => ({
    id,
    type: 1,
    createdAt: '2026-10-02T09:00:00Z',
    readAt: null,
    actor: null,
    projectId: 'p',
    entityType: 2,
    entityId: 't',
    workTicketId: 'k',
    taskStatusId: 1,
    taskDeadline: null,
    commentId: null,
    parameters: {
      projectTitle: null,
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

  const withState = (change: Partial<NotificationsState>) =>
    store.setState({ notifications: { ...initialNotificationsState, ...change } });

  const collect = (effect: EffectName) => {
    const emitted: Action[] = [];
    const source: Observable<Action> = effects[effect];
    source.subscribe((action) => emitted.push(action));
    return emitted;
  };

  beforeEach(() => {
    actions = new Subject<Action>();
    created = new Subject<NotificationCreatedEvent>();
    read = new Subject<NotificationReadEvent>();
    reconnected = new Subject<void>();
    snackBar = { error: vi.fn() };
    service = {
      getSummary: vi.fn(() => of({ unreadCount: 4 })),
      getNotifications: vi.fn(() => of({ items: [], nextCursor: null, hasMore: false, pageSize: 10 })),
      markRead: vi.fn(() => of(undefined)),
      markUnread: vi.fn(() => of(undefined)),
      markAllRead: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        NotificationsEffects,
        provideMockActions(() => actions),
        provideMockStore({ initialState: { notifications: initialNotificationsState } }),
        { provide: NotificationsService, useValue: service },
        { provide: SnackBarService, useValue: snackBar },
        {
          provide: RealtimeService,
          useValue: {
            notificationCreated$: created,
            notificationRead$: read,
            reconnected$: reconnected,
          },
        },
      ],
    });
    store = TestBed.inject(MockStore);
    effects = TestBed.inject(NotificationsEffects);
  });

  it('reads the unread count', () => {
    const emitted = collect('loadSummary$');

    actions.next(Actions.loadSummary());

    expect(emitted).toEqual([Actions.loadSummarySuccess({ unreadCount: 4 })]);
  });

  it('drops a summary still on its way when the user logs out', () => {
    const answer = new Subject<{ unreadCount: number }>();
    service.getSummary.mockReturnValue(answer);
    const emitted = collect('loadSummary$');

    actions.next(Actions.loadSummary());
    actions.next(AuthStoreActions.logoutCompleted());
    answer.next({ unreadCount: 9 });

    expect(emitted).toEqual([]);
  });

  it('reads the newest ten for the panel', () => {
    const emitted = collect('loadLatest$');

    actions.next(Actions.loadLatest());

    expect(service.getNotifications).toHaveBeenCalledWith({ pageSize: 10 });
    expect(emitted).toEqual([Actions.loadLatestSuccess({ items: [] })]);
  });

  it('says so when the panel cannot be read', () => {
    service.getNotifications.mockReturnValue(throwError(() => new Error('offline')));
    const emitted = collect('loadLatest$');

    actions.next(Actions.loadLatest());

    expect(emitted).toEqual([Actions.loadLatestFailure({ error: "Couldn't load notifications." })]);
  });

  it('sends the read and reports a failure', () => {
    service.markRead.mockReturnValueOnce(of(undefined)).mockReturnValueOnce(throwError(() => 'x'));
    const emitted = collect('markRead$');

    actions.next(Actions.markRead({ id: 'a' }));
    actions.next(Actions.markRead({ id: 'b' }));

    expect(emitted).toEqual([
      Actions.markReadSuccess({ id: 'a' }),
      Actions.markReadFailure({ id: 'b' }),
    ]);
  });

  it('after a failed read says so and reads the truth back', () => {
    withState({ latestOpen: true });
    const emitted = collect('markFailed$');

    actions.next(Actions.markAllReadFailure());

    expect(snackBar.error).toHaveBeenCalled();
    expect(emitted).toEqual([Actions.loadSummary(), Actions.loadLatest()]);
  });

  it('takes a new notification from its push', () => {
    const emitted = collect('received$');

    created.next({ id: 'n', unreadCount: 6 });

    expect(emitted).toEqual([Actions.received({ id: 'n', unreadCount: 6 })]);
  });

  it('puts a new one on top of the panel only while the panel is open', () => {
    const emitted = collect('refreshOnReceived$');

    actions.next(Actions.received({ id: 'n', unreadCount: 1 }));
    withState({ latestOpen: true });
    actions.next(Actions.received({ id: 'm', unreadCount: 2 }));
    // Opened once and closed again: the next opening reads the rows anyway.
    withState({ latestOpen: false, latestLoaded: true });
    actions.next(Actions.received({ id: 'k', unreadCount: 3 }));

    expect(emitted).toEqual([Actions.loadLatest()]);
  });

  it('reads the newest ten every time the panel opens', () => {
    const emitted = collect('panelOpened$');

    actions.next(Actions.panelOpened());

    expect(emitted).toEqual([Actions.loadLatest()]);
  });

  it('reads the open page again for a new one, but not after Load more', () => {
    const emitted = collect('refreshOnReceived$');
    const loadedPage = (count: number) => ({
      ...initialNotificationsState.page,
      unreadOnly: true,
      loaded: true,
      items: Array.from({ length: count }, (_, index) => notification(`n${index}`)),
    });

    withState({ page: loadedPage(20) });
    actions.next(Actions.received({ id: 'a', unreadCount: 1 }));
    withState({ page: loadedPage(40) });
    actions.next(Actions.received({ id: 'b', unreadCount: 2 }));

    expect(emitted).toEqual([Actions.loadPage({ unreadOnly: true })]);
  });

  it('reads the next page by the cursor of the list on screen', () => {
    withState({
      page: { ...initialNotificationsState.page, unreadOnly: true, loaded: true, nextCursor: 'next', hasMore: true },
    });
    const emitted = collect('loadMorePage$');

    actions.next(Actions.loadMorePage());

    expect(service.getNotifications).toHaveBeenCalledWith({
      pageSize: 20,
      unreadOnly: true,
      cursor: 'next',
    });
    expect(emitted).toEqual([
      Actions.loadMorePageSuccess({ page: { items: [], nextCursor: null, hasMore: false, pageSize: 10 } }),
    ]);
  });

  it('drops the first page still on its way when the page is left', () => {
    const answer = new Subject<never>();
    service.getNotifications.mockReturnValue(answer);
    const emitted = collect('loadPage$');

    actions.next(Actions.loadPage({ unreadOnly: false }));
    actions.next(Actions.resetPage());

    expect(service.getNotifications).toHaveBeenCalledWith({ pageSize: 20, unreadOnly: false });
    expect(answer.observed).toBe(false);
    expect(emitted).toEqual([]);
  });

  it('sends a mark as unread and reports a failure', () => {
    service.markUnread.mockReturnValueOnce(throwError(() => 'x'));
    const emitted = collect('markUnread$');

    actions.next(Actions.markUnread({ id: 'a' }));

    expect(emitted).toEqual([Actions.markUnreadFailure({ id: 'a' })]);
  });

  it('reads the rows again only when another tab changed the count', () => {
    withState({ latestOpen: true, unreadCount: 3 });
    const emitted = collect('readElsewhere$');

    read.next({ unreadCount: 3 });
    read.next({ unreadCount: 1 });

    expect(emitted).toEqual([
      Actions.readElsewhere({ unreadCount: 3 }),
      Actions.readElsewhere({ unreadCount: 1 }),
      Actions.loadLatest(),
    ]);
  });

  it('reads the count again after a reconnect, and the rows when the panel is open', () => {
    const emitted = collect('reconnected$');

    reconnected.next();
    withState({ latestOpen: true });
    reconnected.next();

    expect(emitted).toEqual([
      Actions.loadSummary(),
      Actions.loadSummary(),
      Actions.loadLatest(),
    ]);
  });
});
