import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NotificationModel } from '../../../core/models/notifications';
import { NotificationsStoreActions } from '../../../store/notifications';
import { initialNotificationsState, NotificationsState } from '../../../store/notifications/notifications.state';
import { NotificationOpenerService } from '../notification-item/notification-opener.service';
import { NotificationBellComponent } from './notification-bell.component';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
const notification = (id: string, readAt: string | null = null): NotificationModel => ({
  id,
  type: 1,
  createdAt: new Date().toISOString(),
  readAt,
  actor: { id: 'u1', name: 'Leyla', surname: 'Mammadova', avatarPath: null },
  projectId: 'p1',
  entityType: 2,
  entityId: 't1',
  workTicketId: 'k1',
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

describe('NotificationBellComponent', () => {
  let store: MockStore;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const render = (state: Partial<NotificationsState> = {}) => {
    store.setState({ notifications: { ...initialNotificationsState, ...state } });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  beforeEach(async () => {
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [...translocoTestingProviders(), 
        provideMockStore({ initialState: { notifications: initialNotificationsState } }),
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  });

  it('reads the unread count when it appears', () => {
    render();

    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.loadSummary());
  });

  it.each([
    [0, null, 'Notifications'],
    [3, '3', 'Notifications, 3 unread'],
    [99, '99', 'Notifications, 99 unread'],
    [120, '99+', 'Notifications, 120 unread'],
  ])('shows %i unread as %s', (unreadCount, badge, label) => {
    const { element } = render({ unreadCount });

    expect(element.querySelector('.bell__badge')?.textContent?.trim() ?? null).toBe(badge);
    expect(element.querySelector('.bell')?.getAttribute('aria-label')).toBe(label);
  });

  it('tells the store when the panel opens and closes', () => {
    const { fixture } = render();

    fixture.componentInstance.onShow();
    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.panelOpened());

    fixture.componentInstance.onHide();
    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.panelClosed());
  });

  it.each([
    [false, 'false'],
    [true, 'true'],
  ])('shows the bell open = %s while the panel is', (latestOpen, expanded) => {
    const { element } = render({ latestOpen });
    const bell = element.querySelector('.bell');

    expect(bell?.classList.contains('bell--open')).toBe(latestOpen);
    expect(bell?.getAttribute('aria-expanded')).toBe(expanded);
  });

  it('marks everything read', () => {
    const { fixture } = render({ unreadCount: 2 });

    fixture.componentInstance.markAllRead();

    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.markAllRead());
  });

  it('closes the panel and opens a notification through the opener', () => {
    const { fixture } = render({ latest: [notification('a')], latestLoaded: true });
    const opener = fixture.debugElement.injector.get(NotificationOpenerService);
    const open = vi.spyOn(opener, 'open').mockImplementation(() => undefined);
    const item = notification('a');

    fixture.componentInstance.open(item);

    expect(open).toHaveBeenCalledWith(item);
  });

  it('leads to the full list', () => {
    const { fixture } = render();

    fixture.componentInstance.viewAll();

    expect(router.navigate).toHaveBeenCalledWith(['/notifications']);
  });
});
