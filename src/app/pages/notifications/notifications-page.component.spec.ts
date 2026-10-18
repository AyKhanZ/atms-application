import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { NotificationModel } from '../../core/models/notifications';
import { NotificationsStoreActions } from '../../store/notifications';
import {
  initialNotificationsState,
  NotificationPageState,
} from '../../store/notifications/notifications.state';
import { NotificationsPageComponent } from './notifications-page.component';

import { translocoTestingProviders } from '../../core/testing/transloco-testing';
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

describe('NotificationsPageComponent', () => {
  let store: MockStore;
  let queryParams: BehaviorSubject<ParamMap>;

  const render = (page: Partial<NotificationPageState> = {}, unreadCount = 0) => {
    store.setState({
      notifications: {
        ...initialNotificationsState,
        unreadCount,
        page: { ...initialNotificationsState.page, ...page },
      },
    });
    const fixture = TestBed.createComponent(NotificationsPageComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  beforeEach(async () => {
    queryParams = new BehaviorSubject(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [...translocoTestingProviders(), 
        provideMockStore({ initialState: { notifications: initialNotificationsState } }),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams } },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  });

  it('reads the list of the filter in the address', () => {
    render();
    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.loadPage({ unreadOnly: false }));

    queryParams.next(convertToParamMap({ filter: 'unread' }));
    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.loadPage({ unreadOnly: true }));
  });

  it('puts the filter in the address', () => {
    const { fixture } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.changeFilter('unread');
    fixture.componentInstance.changeFilter('all');

    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { filter: 'unread' } }));
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { filter: null } }));
  });

  it('shows the rows under their day', () => {
    const { element } = render({ loaded: true, items: [notification('a'), notification('b', '2026-10-02T10:00:00Z')] });

    expect(element.querySelector('.day__label')?.textContent?.trim()).toBe('Today');
    expect(element.querySelectorAll('.row')).toHaveLength(2);
    expect(element.querySelectorAll('.row--unread')).toHaveLength(1);
  });

  it('links a row to its target, so it opens in a new tab too; a deleted one stays a button', () => {
    const { element } = render({
      loaded: true,
      items: [notification('a'), { ...notification('b'), entityDeleted: true }],
    });
    const opens = element.querySelectorAll('.row__open');

    expect(opens[0].getAttribute('href')).toBe('/projects/p1/tickets/k1/tasks/t1');
    expect(opens[1].tagName).toBe('BUTTON');
  });

  it('marks a row read or unread from its dot', () => {
    const { fixture } = render({ loaded: true });

    fixture.componentInstance.toggleRead(notification('a'));
    fixture.componentInstance.toggleRead(notification('b', '2026-10-02T10:00:00Z'));

    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.markRead({ id: 'a' }));
    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.markUnread({ id: 'b' }));
  });

  it.each([
    [false, 'When someone assigns you work'],
    [true, 'Nothing unread'],
  ])('says it is all caught up when the list is empty (unread only: %s)', (unreadOnly, text) => {
    const { element } = render({ loaded: true, unreadOnly });

    expect(element.textContent).toContain("You're all caught up");
    expect(element.textContent).toContain(text);
  });

  it('turns Mark all as read off when nothing is unread', () => {
    const none = render({ loaded: true }, 0).element;
    expect(none.querySelector<HTMLButtonElement>('.notifications-header__read-all')?.disabled).toBe(true);
  });

  it('forgets its list when it is left', () => {
    const { fixture } = render();

    fixture.destroy();

    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.resetPage());
  });
});
