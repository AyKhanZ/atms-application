import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ConfirmationService } from 'primeng/api';
import { NotificationEntityType } from '../../../core/enums/notification-entity-type.enum';
import { NotificationType } from '../../../core/enums/notification-type.enum';
import { NotificationModel } from '../../../core/models/notifications';
import { NotificationsStoreActions } from '../../../store/notifications';
import { NOTIFICATION_NOTICE_KEY, NotificationOpenerService } from './notification-opener.service';

const notification = (overrides: Partial<NotificationModel> = {}): NotificationModel => ({
  id: 'n1',
  type: NotificationType.CommentAdded,
  createdAt: '2026-10-02T09:00:00Z',
  readAt: null,
  actor: null,
  projectId: 'p1',
  entityType: NotificationEntityType.WorkTask,
  entityId: 't1',
  workTicketId: 'k1',
  taskStatusId: 1,
  taskDeadline: null,
  commentId: 'c1',
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
  ...overrides,
});

describe('NotificationOpenerService', () => {
  let opener: NotificationOpenerService;
  let store: MockStore;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let confirmation: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    confirmation = { confirm: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        NotificationOpenerService,
        provideMockStore(),
        { provide: Router, useValue: router },
        { provide: ConfirmationService, useValue: confirmation },
      ],
    });
    opener = TestBed.inject(NotificationOpenerService);
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  });

  it('marks an unread one read and opens the comment on the task details', () => {
    opener.open(notification());

    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.markRead({ id: 'n1' }));
    expect(router.navigate).toHaveBeenCalledWith(
      ['/projects', 'p1', 'tickets', 'k1', 'tasks', 't1'],
      { fragment: 'comment-c1' },
    );
  });

  it('does not send a read again for one already read', () => {
    opener.open(notification({ readAt: '2026-10-02T10:00:00Z' }));

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('says the task was deleted instead of opening nothing', () => {
    opener.open(notification({ entityDeleted: true }));

    expect(router.navigate).not.toHaveBeenCalled();
    expect(confirmation.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        key: NOTIFICATION_NOTICE_KEY,
        header: 'This task was deleted',
        rejectVisible: false,
      }),
    );
    // It is still read: the person has seen it.
    expect(store.dispatch).toHaveBeenCalledWith(NotificationsStoreActions.markRead({ id: 'n1' }));
  });

  it('names a deleted project by its title', () => {
    opener.open(
      notification({
        type: NotificationType.AddedToProject,
        entityType: NotificationEntityType.Project,
        entityId: 'p1',
        entityDeleted: true,
      }),
    );

    expect(confirmation.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        header: 'This project was deleted',
        message: expect.stringContaining('Project Alpha'),
      }),
    );
  });
});
