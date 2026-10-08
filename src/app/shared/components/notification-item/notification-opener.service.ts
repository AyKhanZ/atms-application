import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { NotificationEntityType } from '../../../core/enums/notification-entity-type.enum';
import { NotificationModel } from '../../../core/models/notifications';
import {
  notificationDeletedTarget,
  notificationLink,
  notificationTaskLabel,
} from '../../../core/utils/notification.utils';
import { NotificationsStoreActions } from '../../../store/notifications';
import { confirmTone } from '../confirm-dialog/confirm-dialog.component';

export const NOTIFICATION_NOTICE_KEY = 'notificationTarget';

// same in the bell and on the page; provided by the component with its ConfirmationService
@Injectable()
export class NotificationOpenerService {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);

  open(notification: NotificationModel): void {
    if (!notification.readAt) {
      this.store.dispatch(NotificationsStoreActions.markRead({ id: notification.id }));
    }

    const link = notificationLink(notification);
    if (!link) {
      this.noticeDeleted(notification);
      return;
    }

    void this.router.navigate(link.commands, { fragment: link.fragment });
  }

  private noticeDeleted(notification: NotificationModel): void {
    const target = notificationDeletedTarget(notification);
    const name =
      notification.entityType === NotificationEntityType.Project
        ? (notification.parameters.projectTitle ?? 'Project')
        : notificationTaskLabel(notification.parameters);

    this.confirmation.confirm({
      key: NOTIFICATION_NOTICE_KEY,
      header: `This ${target} was deleted`,
      message: `${name}\nIt can't be opened any more.`,
      acceptLabel: 'Got it',
      rejectVisible: false,
      acceptButtonProps: confirmTone('warning'),
    });
  }
}
