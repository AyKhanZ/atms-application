import { Pipe, PipeTransform } from '@angular/core';
import { NotificationModel } from '../../core/models/notifications';
import {
  isSystemNotification,
  NotificationLink,
  notificationLink,
  notificationShowsDeletedComment,
  NotificationView,
  notificationView,
} from '../../core/utils/notification.utils';

// null when the target was deleted
@Pipe({ name: 'notificationLink' })
export class NotificationLinkPipe implements PipeTransform {
  transform(notification: NotificationModel): NotificationLink | null {
    return notificationLink(notification);
  }
}

@Pipe({ name: 'notificationView' })
export class NotificationViewPipe implements PipeTransform {
  transform(notification: NotificationModel): NotificationView {
    return notificationView(notification);
  }
}

@Pipe({ name: 'notificationCommentDeleted' })
export class NotificationCommentDeletedPipe implements PipeTransform {
  transform(notification: NotificationModel): boolean {
    return notificationShowsDeletedComment(notification);
  }
}

@Pipe({ name: 'isSystemNotification' })
export class IsSystemNotificationPipe implements PipeTransform {
  transform(notification: NotificationModel): boolean {
    return isSystemNotification(notification);
  }
}
