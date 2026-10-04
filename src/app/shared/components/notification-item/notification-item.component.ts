import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NotificationModel } from '../../../core/models/notifications';
import { HistoryTimePipe } from '../../pipes/history.pipe';
import {
  IsSystemNotificationPipe,
  NotificationCommentDeletedPipe,
  NotificationViewPipe,
} from '../../pipes/notification.pipe';
import { PersonInitialsPipe, PersonNamePipe } from '../../pipes/person-name.pipe';
import { OverdueBadgeComponent } from '../overdue-badge/overdue-badge.component';
import { ProfileAvatarComponent } from '../profile-avatar/profile-avatar.component';
import { WorkItemRefComponent } from '../work-item-ref/work-item-ref.component';
import { WorkItemStatusBadgeComponent } from '../work-item-status-badge/work-item-status-badge.component';

/**
 * What one notification says: the work it is about, then who did what and when. The bell and the
 * Notifications page wrap it in their own row, which decides what a click does.
 */
@Component({
  selector: 'app-notification-item',
  imports: [
    ProfileAvatarComponent,
    OverdueBadgeComponent,
    WorkItemRefComponent,
    WorkItemStatusBadgeComponent,
    HistoryTimePipe,
    IsSystemNotificationPipe,
    NotificationCommentDeletedPipe,
    NotificationViewPipe,
    PersonInitialsPipe,
    PersonNamePipe,
  ],
  host: { '[class.is-unread]': '!notification().readAt' },
  templateUrl: './notification-item.component.html',
  styleUrl: './notification-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationItemComponent {
  readonly notification = input.required<NotificationModel>();
}
