import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { NotificationModel } from '../../../core/models/notifications';
import { notificationStatusKey, NotificationView } from '../../../core/utils/notification.utils';
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

const actorMark = '@@ACTOR@@';

// bell and the page wrap it in their own row and decide what a click does
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
    TranslocoDirective,
  ],
  host: { '[class.is-unread]': '!notification().readAt' },
  templateUrl: './notification-item.component.html',
  styleUrl: './notification-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationItemComponent {
  private readonly transloco = inject(TranslocoService);

  readonly notification = input.required<NotificationModel>();

  // split around the name, so it stays bold wherever the language puts it and no html is built
  protected actionParts(view: NotificationView): { before: string; actor: string | null; after: string } {
    if (!view.includeActor) {
      return { before: this.transloco.translate(view.actionKey, view.actionParams), actor: null, after: '' };
    }

    const text = this.transloco.translate(view.actionKey, { ...view.actionParams, actor: actorMark });
    const [before, after = ''] = text.split(actorMark);
    return {
      before,
      actor: view.actor ?? this.transloco.translate('notifications.someone'),
      after,
    };
  }

  protected statusName(status: DictionaryModel): DictionaryModel {
    const key = notificationStatusKey(status.code);
    return key ? { ...status, name: this.transloco.translate(key) } : status;
  }
}
