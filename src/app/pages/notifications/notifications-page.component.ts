import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { angularLocale, currentLanguage } from '../../core/i18n/active-language';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { NotificationModel } from '../../core/models/notifications';
import { startOfDay } from '../../core/utils/deadline.utils';
import { NotificationDayGroup, groupNotificationsByDay } from '../../core/utils/notification.utils';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  SearchFilterChip,
  SearchFiltersComponent,
} from '../../shared/components/global-search/search-filters.component';
import { LoadMoreButtonComponent } from '../../shared/components/load-more-button/load-more-button.component';
import { NotificationItemComponent } from '../../shared/components/notification-item/notification-item.component';
import {
  NOTIFICATION_NOTICE_KEY,
  NotificationOpenerService,
} from '../../shared/components/notification-item/notification-opener.service';
import { ScrollSentinelDirective } from '../../shared/directives/scroll-sentinel.directive';
import { NotificationsStoreActions, NotificationsStoreSelectors } from '../../store/notifications';

type NotificationFilter = 'all' | 'unread';

@Component({
  selector: 'app-notifications-page',
  imports: [
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadMoreButtonComponent,
    NotificationItemComponent,
    ScrollSentinelDirective,
    SearchFiltersComponent,
    TranslocoDirective,
  ],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
  providers: [ConfirmationService, NotificationOpenerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly opener = inject(NotificationOpenerService);
  private readonly transloco = inject(TranslocoService);

  protected readonly noticeKey = NOTIFICATION_NOTICE_KEY;
  readonly chips = computed<SearchFilterChip<NotificationFilter>[]>(() => {
    currentLanguage();
    return [
      { type: 'all', label: this.transloco.translate('search.all'), disabled: false },
      { type: 'unread', label: this.transloco.translate('notifications.unread'), disabled: false },
    ];
  });

  readonly page = this.store.selectSignal(NotificationsStoreSelectors.getPage);
  readonly unreadCount = this.store.selectSignal(NotificationsStoreSelectors.getUnreadCount);
  readonly filter = computed<NotificationFilter>(() => (this.page().unreadOnly ? 'unread' : 'all'));
  readonly groups = computed(() => {
    currentLanguage();
    return groupNotificationsByDay(this.page().items);
  });
  readonly firstLoad = computed(() => this.page().loading && this.page().items.length === 0);
  readonly empty = computed(
    () => this.page().loaded && !this.page().loading && !this.page().error && this.page().items.length === 0,
  );

  constructor() {
    // filter lives in the url so refresh and Back keep it
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const unreadOnly = params.get('filter') === 'unread';
      this.store.dispatch(NotificationsStoreActions.loadPage({ unreadOnly }));
    });
  }

  groupTitle(group: NotificationDayGroup): string {
    if (group.day === 'today') return this.transloco.translate('common.today');
    if (group.day === 'yesterday') return this.transloco.translate('notifications.yesterday');
    const day = startOfDay(group.items[0].createdAt);
    const pattern = day.getFullYear() === new Date().getFullYear() ? 'd MMM' : 'd MMM y';
    return formatDate(day, pattern, angularLocale());
  }

  ngOnDestroy(): void {
    this.store.dispatch(NotificationsStoreActions.resetPage());
  }

  changeFilter(filter: NotificationFilter): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter === 'unread' ? 'unread' : null },
    });
  }

  open(notification: NotificationModel): void {
    this.opener.open(notification);
  }

  toggleRead(notification: NotificationModel): void {
    this.store.dispatch(
      notification.readAt
        ? NotificationsStoreActions.markUnread({ id: notification.id })
        : NotificationsStoreActions.markRead({ id: notification.id }),
    );
  }

  markAllRead(): void {
    this.store.dispatch(NotificationsStoreActions.markAllRead());
  }

  loadMore(): void {
    const page = this.page();
    if (page.loading || page.loadingMore || !page.hasMore) return;
    this.store.dispatch(NotificationsStoreActions.loadMorePage());
  }

  retry(): void {
    this.store.dispatch(NotificationsStoreActions.loadPage({ unreadOnly: this.page().unreadOnly }));
  }
}
