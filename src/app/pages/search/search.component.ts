import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Store } from '@ngrx/store';
import { GlobalSearchItemModel } from '../../core/models/global-search';
import { WorkItemKind } from '../../core/models/work-items';
import { GlobalSearchStoreActions, GlobalSearchStoreSelectors } from '../../store/global-search';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SearchResultRowComponent } from '../../shared/components/global-search/search-result-row.component';
import {
  SearchFilterChip,
  SearchFiltersComponent,
} from '../../shared/components/global-search/search-filters.component';
import { workItemRoute } from '../../shared/components/global-search/work-item-route';
import { ScrollSentinelDirective } from '../../shared/directives/scroll-sentinel.directive';
import { ListSearchComponent } from '../../shared/components/list-search/list-search.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import {
  workItemKindOrder,
  workItemKinds,
} from '../../shared/components/work-item-ref/work-item-kinds';

@Component({
  selector: 'app-search-page',
  imports: [
    ListSearchComponent,
    SearchFiltersComponent,
    SearchResultRowComponent,
    ScrollSentinelDirective,
    EmptyStateComponent,
    BackButtonComponent,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly navigationHistory = inject(NavigationHistoryService);

  readonly query = signal('');
  readonly itemType = signal(WorkItemKind.Task);
  readonly items = this.store.selectSignal(GlobalSearchStoreSelectors.getPageItems);
  readonly cursor = this.store.selectSignal(GlobalSearchStoreSelectors.getPageCursor);
  readonly hasMore = this.store.selectSignal(GlobalSearchStoreSelectors.pageHasMore);
  readonly loading = this.store.selectSignal(GlobalSearchStoreSelectors.isPageLoading);
  readonly pageError = this.store.selectSignal(GlobalSearchStoreSelectors.getPageError);
  readonly failed = computed(() => this.pageError() !== null);

  private readonly typing = new Subject<string>();

  readonly empty = computed(() => !this.loading() && !this.failed() && this.items().length === 0);

  /** Every kind stays clickable: the page is where you widen a search, not where you are stuck. */
  readonly chips: SearchFilterChip[] = workItemKindOrder.map((type) => ({
    type,
    label: workItemKinds[type].pluralLabel,
    disabled: false,
  }));

  constructor() {
    this.typing
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: value, type: this.itemType() },
          // Replace, not push: every letter would otherwise become a step in the back button.
          replaceUrl: true,
        });
      });

    // The query and the type live in the address, so the page survives a refresh and the link
    // can be sent to someone else. This is also the single place a load starts from.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const type = Number(params.get('type'));
      this.query.set(params.get('q') ?? '');
      this.itemType.set(
        type >= WorkItemKind.Project && type <= WorkItemKind.Subtask ? type : WorkItemKind.Task,
      );
      this.reload();
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(GlobalSearchStoreActions.resetPage());
  }

  /** The field answers at once, the address and the request wait for a pause in typing. */
  changeQuery(value: string): void {
    this.query.set(value);
    this.typing.next(value);
  }

  changeType(type: WorkItemKind | null): void {
    if (type === null) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.query(), type },
    });
  }

  /** Where the user came from. The page has no parent, so a page opened from a link falls back
   *  to the dashboard. Switching the kind or the query stays one stop in the history. */
  back(): void {
    if (!this.navigationHistory.back()) void this.router.navigateByUrl('/dashboard');
  }

  open(item: GlobalSearchItemModel): void {
    void this.router.navigateByUrl(workItemRoute(item));
  }

  /** Called by the sentinel when the end of the list comes into view, and by the button below it. */
  loadMore(): void {
    if (this.loading() || !this.hasMore()) return;
    this.load(this.cursor());
  }

  retry(): void {
    this.load(this.cursor());
  }

  private reload(): void {
    this.load(null);
  }

  private load(cursor: string | null): void {
    const query = this.query().trim();
    this.store.dispatch(
      GlobalSearchStoreActions.loadPage({ query, itemType: this.itemType(), cursor }),
    );
  }
}
