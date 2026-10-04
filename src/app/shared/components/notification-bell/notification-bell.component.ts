import { ChangeDetectionStrategy, Component, OnInit, computed, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { Popover, PopoverModule } from 'primeng/popover';
import { NotificationModel } from '../../../core/models/notifications';
import { unreadBadge } from '../../../core/utils/notification.utils';
import { NotificationsStoreActions, NotificationsStoreSelectors } from '../../../store/notifications';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { NotificationItemComponent } from '../notification-item/notification-item.component';
import {
  NOTIFICATION_NOTICE_KEY,
  NotificationOpenerService,
} from '../notification-item/notification-opener.service';

/** The bell in the top bar: the unread count, and the newest ten in a panel under it. */
@Component({
  selector: 'app-notification-bell',
  imports: [PopoverModule, ConfirmDialogComponent, NotificationItemComponent],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
  providers: [ConfirmationService, NotificationOpenerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly opener = inject(NotificationOpenerService);
  private readonly panel = viewChild.required<Popover>('panel');

  protected readonly noticeKey = NOTIFICATION_NOTICE_KEY;
  readonly unreadCount = this.store.selectSignal(NotificationsStoreSelectors.getUnreadCount);
  readonly latest = this.store.selectSignal(NotificationsStoreSelectors.getLatest);
  readonly loaded = this.store.selectSignal(NotificationsStoreSelectors.getLatestLoaded);
  // From the store, not from the popover: its visibility is a plain field that nothing redraws
  // when it changes, so the button would stay lit after the panel closed.
  readonly panelOpen = this.store.selectSignal(NotificationsStoreSelectors.getLatestOpen);
  readonly loading = this.store.selectSignal(NotificationsStoreSelectors.getLatestLoading);
  readonly error = this.store.selectSignal(NotificationsStoreSelectors.getLatestError);
  readonly badge = computed(() => unreadBadge(this.unreadCount()));
  readonly buttonLabel = computed(() => {
    const count = this.unreadCount();
    return count > 0 ? `Notifications, ${count} unread` : 'Notifications';
  });

  ngOnInit(): void {
    this.store.dispatch(NotificationsStoreActions.loadSummary());
  }

  toggle(event: Event): void {
    this.panel().toggle(event);
  }

  onShow(): void {
    this.store.dispatch(NotificationsStoreActions.panelOpened());
  }

  onHide(): void {
    this.store.dispatch(NotificationsStoreActions.panelClosed());
  }

  retry(): void {
    this.store.dispatch(NotificationsStoreActions.loadLatest());
  }

  markAllRead(): void {
    this.store.dispatch(NotificationsStoreActions.markAllRead());
  }

  open(notification: NotificationModel): void {
    this.panel().hide();
    this.opener.open(notification);
  }

  viewAll(): void {
    this.panel().hide();
    void this.router.navigate(['/notifications']);
  }
}
