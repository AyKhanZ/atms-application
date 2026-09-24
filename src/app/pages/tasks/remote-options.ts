import { DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  debounceTime,
  map,
  merge,
  of,
  switchMap,
} from 'rxjs';
import { FilterOption } from './components/task-filters/filter-option';

/** One page of options and where the next one starts; null when there is no next. */
export interface OptionsPage {
  options: FilterOption[];
  next: string | null;
}

/** A pause in typing before the server is asked. */
const typingPause = 300;

/**
 * The options of one searchable dropdown read from the server a page at a time: a page when it
 * opens, another page for every search term, the next page when the list is scrolled to its end.
 * Only what the user reaches is ever loaded, however many projects or tickets there are.
 *
 * A chosen option stays in the list even when the current page does not hold it — after a search,
 * or when the choice came with a shared link — so the field can still name it.
 */
export class RemoteOptions {
  private readonly loaded = signal<FilterOption[]>([]);
  private readonly known = signal<ReadonlyMap<string, FilterOption>>(new Map());
  private readonly chosen = signal<readonly string[]>([]);
  private readonly typed = new Subject<string>();
  private readonly asked = new Subject<{ term: string; next: string | null }>();
  private term = '';
  /** Ids being read to be named, so a choice made twice is not read twice. */
  private readonly naming = new Set<string>();
  private next: string | null = null;

  readonly loading = signal(false);
  readonly hasMore = signal(false);
  /** The chosen options not on the current page first, then the page. */
  readonly options = computed(() => {
    const loaded = this.loaded();
    const onPage = new Set(loaded.map((option) => option.value));
    const missing = this.chosen()
      .filter((id) => !onPage.has(id))
      .map((id) => this.known().get(id))
      .filter((option): option is FilterOption => !!option);
    return [...missing, ...loaded];
  });

  constructor(
    private readonly fetch: (term: string, next: string | null) => Observable<OptionsPage>,
    private readonly resolve: (id: string) => Observable<FilterOption>,
    private readonly destroyRef: DestroyRef,
  ) {
    const searches = this.typed.pipe(
      debounceTime(typingPause),
      map((term) => ({ term: term.trim(), next: null })),
    );

    merge(searches, this.asked)
      .pipe(
        switchMap((request) => {
          this.term = request.term;
          this.loading.set(true);
          // A failed page leaves the list as it was: the dropdown still works with what it has.
          return this.fetch(request.term, request.next).pipe(
            map((page) => ({ page, append: request.next !== null })),
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (!result) return;
        this.remember(result.page.options);
        this.loaded.update((current) =>
          result.append ? [...current, ...result.page.options] : result.page.options,
        );
        this.next = result.page.next;
        this.hasMore.set(result.page.next !== null);
      });
  }

  /** The first page, without a search term. */
  reload(): void {
    this.asked.next({ term: '', next: null });
  }

  /** What the user types into the dropdown's search box. */
  search(term: string): void {
    this.typed.next(term);
  }

  /** The list was scrolled to its end. */
  more(): void {
    if (!this.loading() && this.next) this.asked.next({ term: this.term, next: this.next });
  }

  clear(): void {
    this.loaded.set([]);
    this.next = null;
    this.hasMore.set(false);
  }

  /** The chosen values; any the list has not seen yet are read one by one to be named. */
  choose(ids: readonly string[]): void {
    this.chosen.set(ids);
    for (const id of ids) {
      if (this.known().has(id) || this.naming.has(id)) continue;
      this.naming.add(id);
      this.resolve(id)
        .pipe(
          catchError(() => EMPTY),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((option) => this.remember([option]));
    }
  }

  private remember(options: readonly FilterOption[]): void {
    this.known.update((known) => {
      const next = new Map(known);
      for (const option of options) next.set(option.value, option);
      return next;
    });
  }
}
