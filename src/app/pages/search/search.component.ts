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
import { LoadMoreButtonComponent } from '../../shared/components/load-more-button/load-more-button.component';
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
    LoadMoreButtonComponent,
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
          // replace, not push, or every letter is a Back step
          replaceUrl: true,
        });
      });

    // query and type in the url so refresh works and the link can be shared; the only place loading starts
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

  // field updates at once, url and request wait for a pause
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

  // dashboard when opened by link; switching kind or query is one stop in history
  back(): void {
    if (!this.navigationHistory.back()) void this.router.navigateByUrl('/dashboard');
  }

  open(item: GlobalSearchItemModel): void {
    void this.router.navigateByUrl(workItemRoute(item));
  }

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
