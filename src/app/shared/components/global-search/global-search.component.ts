import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Store } from '@ngrx/store';
import { LayoutService } from '../../../core/services/layout.service';
import { GlobalSearchGroupModel, GlobalSearchItemModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';
import { GlobalSearchStoreActions, GlobalSearchStoreSelectors } from '../../../store/global-search';
import { SearchInputComponent } from './search-input.component';
import { SearchFilterChip, SearchFiltersComponent } from './search-filters.component';
import { SearchResultGroup, SearchResultsComponent } from './search-results.component';
import { SearchResultRowComponent } from './search-result-row.component';
import { isSearchable, workItemRoute } from './work-item-route';
import { workItemKindOrder, workItemKinds } from '../work-item-ref/work-item-kinds';

@Component({
  selector: 'app-global-search',
  imports: [
    SearchInputComponent,
    SearchFiltersComponent,
    SearchResultsComponent,
    SearchResultRowComponent,
  ],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly layout = inject(LayoutService);
  private readonly input = viewChild(SearchInputComponent);
  private restoringFocus = false;
  private lastPointer = { x: -1, y: -1 };

  readonly open = signal(false);
  /** Width from the field's left edge to the window's, less a margin; null until measured. */
  readonly room = signal<number | null>(null);
  /** Follows the layout's phone breakpoint; writable so a test can pin it. */
  readonly isMobile = linkedSignal(() => this.layout.isPhone());
  readonly query = this.store.selectSignal(GlobalSearchStoreSelectors.getPopupQuery);
  readonly loading = this.store.selectSignal(GlobalSearchStoreSelectors.isPopupLoading);
  readonly error = this.store.selectSignal(GlobalSearchStoreSelectors.getPopupError);
  readonly failed = computed(() => this.error() !== null);
  readonly filter = signal<WorkItemKind | null>(null);
  readonly activeId = signal<string | null>(null);

  private readonly response = this.store.selectSignal(GlobalSearchStoreSelectors.getPopupResult);

  /** Only asked for once the query is long enough; until then the server would refuse it. */
  readonly searchable = computed(() => isSearchable(this.query()));

  private readonly cachedRecent = this.store.selectSignal(
    GlobalSearchStoreSelectors.getPopupRecent,
  );
  readonly recent = computed(() => this.cachedRecent() ?? []);

  /** The box has just opened and the recent list is still on its way: nothing is drawn yet, so the
   *  empty-state hint does not flash for a blink before the list replaces it. */
  readonly waitingForRecent = computed(
    () => this.query().trim().length === 0 && this.cachedRecent() === null && !this.failed(),
  );

  private readonly allGroups = computed<SearchResultGroup[]>(() => {
    const response = this.response();
    const groups: Record<WorkItemKind, GlobalSearchGroupModel> = {
      [WorkItemKind.Project]: response.projects,
      [WorkItemKind.Ticket]: response.tickets,
      [WorkItemKind.Task]: response.tasks,
      [WorkItemKind.Subtask]: response.subtasks,
    };
    return workItemKindOrder
      .map((type) => ({ type, label: workItemKinds[type].pluralLabel, ...groups[type] }))
      .filter((group) => group.items.length > 0);
  });

  /** The chip narrows what is shown; it is not another request, the answer already has everything. */
  readonly groups = computed(() => {
    const filter = this.filter();
    return filter === null
      ? this.allGroups()
      : this.allGroups().filter((group) => group.type === filter);
  });

  readonly chips = computed<SearchFilterChip[]>(() => {
    const present = new Set(this.allGroups().map((group) => group.type));
    return [
      { type: null, label: 'All', disabled: false },
      ...workItemKindOrder.map((type) => ({
        type,
        label: workItemKinds[type].pluralLabel,
        disabled: !present.has(type),
      })),
    ];
  });

  /** Everything a keyboard can land on, in the order it is drawn. */
  readonly selectable = computed<GlobalSearchItemModel[]>(() =>
    this.searchable() ? this.groups().flatMap((group) => group.items) : this.recent(),
  );

  readonly nothingFound = computed(
    () => this.searchable() && !this.loading() && !this.failed() && this.allGroups().length === 0,
  );

  constructor() {
    // The field is sized by the layout: a sidebar folding or a window resized moves and resizes
    // it without any event of its own, so it is watched directly.
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => this.measureRoom());
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    }

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.close(false));
  }

  show(): void {
    if (this.open() || this.restoringFocus) return;
    this.open.set(true);
    this.measureRoom();
    this.changeQuery('');
    afterNextRender(() => this.input()?.focus(), { injector: this.injector });
  }

  close(restoreFocus = true): void {
    if (!this.open()) return;
    this.store.dispatch(GlobalSearchStoreActions.resetPopup());
    this.open.set(false);
    this.activeId.set(null);
    if (restoreFocus) {
      afterNextRender(
        () => {
          this.restoringFocus = true;
          if (this.isMobile())
            this.host.nativeElement.querySelector<HTMLButtonElement>('.mobile-trigger')?.focus();
          else this.input()?.focus();
          this.restoringFocus = false;
        },
        { injector: this.injector },
      );
    }
  }

  changeQuery(value: string): void {
    if (!this.open()) this.show();
    this.activeId.set(null);
    this.filter.set(null);
    this.store.dispatch(GlobalSearchStoreActions.searchPopup({ query: value }));
  }

  retry(): void {
    this.store.dispatch(GlobalSearchStoreActions.searchPopup({ query: this.query() }));
  }

  changeFilter(type: WorkItemKind | null): void {
    this.filter.set(type);
    this.activeId.set(null);
  }

  /**
   * The pointer and the arrows move one and the same highlight. Nothing is lit until one of them
   * picks a row: a row lit in advance reads as already chosen, and next to a hovered one it made
   * two rows look selected.
   *
   * Only a pointer that really moved counts. When the arrows scroll the list, the rows slide under
   * a resting cursor and the browser reports that as hovering — which used to snatch the highlight
   * straight back from the keyboard.
   */
  point(id: string, event: MouseEvent): void {
    if (event.clientX === this.lastPointer.x && event.clientY === this.lastPointer.y) return;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.activeId.set(id);
  }

  choose(item: GlobalSearchItemModel): void {
    this.close(false);
    void this.router.navigateByUrl(workItemRoute(item));
  }

  showAll(type: WorkItemKind): void {
    const query = this.query().trim();
    this.close(false);
    void this.router.navigate(['/search'], { queryParams: { q: query, type } });
  }

  /** Room from the field's left edge to the window's right edge, measured when the box opens and
   *  whenever the field changes size while it is open. */
  private measureRoom(): void {
    if (!this.open()) return;
    const shell = this.host.nativeElement.querySelector<HTMLElement>('.search-shell');
    if (!shell) return;
    const margin = 16;
    this.room.set(window.innerWidth - shell.getBoundingClientRect().left - margin);
  }

  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    if (!this.open() || this.isMobile()) return;
    if (event.target instanceof Node && this.host.nativeElement.contains(event.target)) return;
    this.close(false);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open() || event.isComposing) return;

    if (event.key === 'Tab') {
      if (!this.isMobile()) return;
      const controls = Array.from(
        this.host.nativeElement.querySelectorAll<HTMLElement>(
          '.search-shell--mobile input, .search-shell--mobile button:not(:disabled), .search-shell--mobile [tabindex="0"]',
        ),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === 'Enter') {
      // Only from the field: a focused chip or row handles Enter itself.
      if (!(event.target instanceof HTMLInputElement)) return;
      const item = this.selectable().find((value) => value.id === this.activeId());
      if (item) {
        event.preventDefault();
        this.choose(item);
      }
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    // Anywhere inside the box, not just the field: after a click on a filter chip focus sits on
    // the chip, and the arrows went dead there.
    if (!(event.target instanceof Node) || !this.host.nativeElement.contains(event.target)) return;

    const items = this.selectable();
    if (items.length === 0) return;

    event.preventDefault();
    const current = items.findIndex((item) => item.id === this.activeId());
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next =
      current < 0
        ? step === 1
          ? 0
          : items.length - 1
        : (current + step + items.length) % items.length;
    this.activeId.set(items[next].id);
    this.scrollIntoView(items[next].id);
  }

  /** Looked up inside this component, not across the page: the overlay lives in its own template,
   *  and a document-wide search would find whatever else carried the same marker. */
  private scrollIntoView(id: string): void {
    queueMicrotask(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>(`[data-result-id="${id}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }
}
