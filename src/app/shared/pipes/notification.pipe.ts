import { Pipe, PipeTransform } from '@angular/core';
import { NotificationModel } from '../../core/models/notifications';
import {
  isSystemNotification,
  notificationShowsDeletedComment,
  NotificationView,
  notificationView,
} from '../../core/utils/notification.utils';

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
