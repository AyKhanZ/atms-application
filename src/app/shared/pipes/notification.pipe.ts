import { Pipe, PipeTransform } from '@angular/core';
import { NotificationModel } from '../../core/models/notifications';
import {
  isSystemNotification,
  notificationShowsDeletedComment,
  NotificationView,
  notificationView,
} from '../../core/utils/notification.utils';

/** What a notification row shows: the work it is about, then who did what. */
@Pipe({ name: 'notificationView' })
export class NotificationViewPipe implements PipeTransform {
  transform(notification: NotificationModel): NotificationView {
    return notificationView(notification);
  }
}

/** A notification about a comment that was deleted since: it says so under the sentence. */
@Pipe({ name: 'notificationCommentDeleted' })
export class NotificationCommentDeletedPipe implements PipeTransform {
  transform(notification: NotificationModel): boolean {
    return notificationShowsDeletedComment(notification);
  }
}

/** A deadline reminder: no person did it, so a clock stands where the avatar would. */
@Pipe({ name: 'isSystemNotification' })
export class IsSystemNotificationPipe implements PipeTransform {
  transform(notification: NotificationModel): boolean {
    return isSystemNotification(notification);
  }
}
