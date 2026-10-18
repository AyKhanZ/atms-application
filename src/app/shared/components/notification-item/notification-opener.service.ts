import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { NotificationEntityType } from '../../../core/enums/notification-entity-type.enum';
import { NotificationModel } from '../../../core/models/notifications';
import {
  notificationKindKey,
  notificationLink,
  notificationTaskLabel,
} from '../../../core/utils/notification.utils';
import { NotificationsStoreActions } from '../../../store/notifications';
import { confirmTone } from '../confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@jsverse/transloco';

export const NOTIFICATION_NOTICE_KEY = 'notificationTarget';

// same in the bell and on the page; provided by the component with its ConfirmationService
@Injectable()
export class NotificationOpenerService {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  open(notification: NotificationModel): void {
    this.markRead(notification);

    const link = notificationLink(notification);
    if (!link) {
      this.noticeDeleted(notification);
      return;
    }

    void this.router.navigate(link.commands, { fragment: link.fragment });
  }

  // the link navigates itself; a click, ctrl+click or middle click is a visit, a right click only opens the menu
  followed(notification: NotificationModel, event: MouseEvent): void {
    if (event.button > 1) return;
    this.markRead(notification);
  }

  private markRead(notification: NotificationModel): void {
    if (!notification.readAt) {
      this.store.dispatch(NotificationsStoreActions.markRead({ id: notification.id }));
    }
  }

  private noticeDeleted(notification: NotificationModel): void {
    const kind = this.transloco
      .translate(notificationKindKey(notification.parameters))
      .toLocaleUpperCase(this.transloco.getActiveLang());
    const name =
      notification.entityType === NotificationEntityType.Project
        ? (notification.parameters.projectTitle ?? this.transloco.translate('workItem.kind.project'))
        : notificationTaskLabel(notification.parameters, kind);

    this.confirmation.confirm({
      key: NOTIFICATION_NOTICE_KEY,
      header: this.transloco.translate(
        notification.entityType === NotificationEntityType.Project
          ? 'notifications.projectDeleted'
          : 'notifications.taskDeleted',
      ),
      message: `${name}\n${this.transloco.translate('notifications.cannotOpen')}`,
      acceptLabel: this.transloco.translate('common.gotIt'),
      rejectVisible: false,
      acceptButtonProps: confirmTone('warning'),
    });
  }
}
