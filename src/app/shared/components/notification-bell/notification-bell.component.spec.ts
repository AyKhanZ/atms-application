import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Popover } from 'primeng/popover';
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

  const render = (state: Partial<NotificationsState> = {}) => {
    store.setState({ notifications: { ...initialNotificationsState, ...state } });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const showPanel = (fixture: ComponentFixture<NotificationBellComponent>, element: HTMLElement) => {
    (element.querySelector('.bell') as HTMLButtonElement).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [...translocoTestingProviders(), 
        provideMockStore({ initialState: { notifications: initialNotificationsState } }),
        provideRouter([]),
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

  it('links a notification to its target, so it opens in a new tab too', () => {
    const { fixture, element } = render({ latest: [notification('a')], latestLoaded: true });
    showPanel(fixture, element);

    expect(element.ownerDocument.querySelector('a.row')?.getAttribute('href')).toBe(
      '/projects/p1/tickets/k1/tasks/t1',
    );
  });

  it('keeps a deleted target a button that explains itself', () => {
    const { fixture, element } = render({
      latest: [{ ...notification('a'), entityDeleted: true }],
      latestLoaded: true,
    });
    showPanel(fixture, element);

    expect(element.ownerDocument.querySelector('a.row')).toBeNull();
    expect(element.ownerDocument.querySelector('button.row')).not.toBeNull();
  });

  it.each([
    ['a plain click', { button: 0 }, true],
    ['ctrl+click', { button: 0, ctrlKey: true }, false],
    ['a middle click', { button: 1 }, false],
  ])('marks it read on %s and closes the panel only when the app navigates', (_name, init, hides) => {
    const { fixture } = render({ latest: [notification('a')], latestLoaded: true });
    const hide = vi.spyOn(Popover.prototype, 'hide');

    fixture.componentInstance.followed(notification('a'), new MouseEvent('click', init));

    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.markRead({ id: 'a' }));
    expect(hide).toHaveBeenCalledTimes(hides ? 1 : 0);
    hide.mockRestore();
  });

  it('leads to the full list', () => {
    const { fixture } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.viewAll();

    expect(navigate).toHaveBeenCalledWith(['/notifications']);
  });
});
