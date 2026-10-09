import { TestBed } from '@angular/core/testing';
import { NotificationEntityType } from '../../../core/enums/notification-entity-type.enum';
import { NotificationType } from '../../../core/enums/notification-type.enum';
import { WorkTaskStatus } from '../../../core/enums/work-task-status.enum';
import { NotificationModel } from '../../../core/models/notifications';
import { NotificationItemComponent } from './notification-item.component';
import { translocoTestingProviders } from '../../../core/testing/transloco-testing';

const notification = (overrides: Partial<NotificationModel> = {}): NotificationModel => ({
  id: 'n1',
  type: NotificationType.TaskStatusChanged,
  createdAt: new Date().toISOString(),
  readAt: null,
  actor: { id: 'u1', name: 'Leyla', surname: 'Mammadova', avatarPath: null },
  projectId: 'p1',
  entityType: NotificationEntityType.WorkTask,
  entityId: 't1',
  workTicketId: 'k1',
  taskStatusId: WorkTaskStatus.InProgress,
  taskDeadline: null,
  commentId: null,
  parameters: {
    projectTitle: 'Project Alpha',
    taskCode: '81',
    taskTitle: 'Payment form',
    taskKind: 2,
    fromStatusId: WorkTaskStatus.InProgress,
    toStatusId: WorkTaskStatus.Done,
    deadline: null,
  },
  entityDeleted: false,
  commentDeleted: false,
  ...overrides,
});

describe('NotificationItemComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...translocoTestingProviders()] });
  });

  const render = (value: NotificationModel) => {
    const fixture = TestBed.createComponent(NotificationItemComponent);
    fixture.componentRef.setInput('notification', value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

  it('names the work like every list and the status as a dot', () => {
    const element = render(notification());

    expect(element.querySelector('app-work-item-ref')?.getAttribute('data-kind')).toBe('subtask');
    expect(text(element.querySelector('app-work-item-ref'))).toBe('Subtask #81');
    expect(text(element.querySelector('.item__title'))).toBe('Payment form');
    expect(text(element.querySelector('.item__line'))).toContain('Leyla M. moved it to');
    expect(element.querySelector('app-work-item-status-badge [data-tone="success"]')).not.toBeNull();
  });

  it('marks an unread one by the weight of its title, not by a fill', () => {
    const fixture = TestBed.createComponent(NotificationItemComponent);
    fixture.componentRef.setInput('notification', notification());
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).classList.contains('is-unread')).toBe(true);

    fixture.componentRef.setInput('notification', notification({ readAt: '2026-10-02T10:00:00Z' }));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).classList.contains('is-unread')).toBe(false);
  });

  it('puts the red pill on a reminder while the task is still late, with a clock instead of a person', () => {
    const element = render(
      notification({
        type: NotificationType.TaskOverdue,
        actor: null,
        taskDeadline: '2020-01-01T00:00:00Z',
        parameters: { ...notification().parameters, deadline: '2020-01-01' },
      }),
    );

    expect(element.querySelector('.overdue-badge')).not.toBeNull();
    expect(element.querySelector('.item__clock')).not.toBeNull();
    expect(element.querySelector('app-profile-avatar')).toBeNull();
    expect(text(element.querySelector('.item__line'))).toContain('Was due 1 Jan');
  });

  it('leaves the pill off once the task is done', () => {
    const element = render(
      notification({
        type: NotificationType.TaskOverdue,
        taskStatusId: WorkTaskStatus.Done,
        taskDeadline: '2020-01-01T00:00:00Z',
      }),
    );

    expect(element.querySelector('.overdue-badge')).toBeNull();
  });
});
