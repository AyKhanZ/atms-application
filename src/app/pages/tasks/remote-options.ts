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

// null = no next page
export interface OptionsPage {
  options: FilterOption[];
  next: string | null;
}

const typingPause = 300;

// only what the user reaches is loaded
// a chosen option stays even if the current page doesnt have it (search, shared link)
export class RemoteOptions {
  private readonly loaded = signal<FilterOption[]>([]);
  private readonly known = signal<ReadonlyMap<string, FilterOption>>(new Map());
  private readonly chosen = signal<readonly string[]>([]);
  private readonly typed = new Subject<string>();
  private readonly asked = new Subject<{ term: string; next: string | null }>();
  private term = '';
  // so a choice made twice isnt read twice
  private readonly naming = new Set<string>();
  private next: string | null = null;

  readonly loading = signal(false);
  readonly hasMore = signal(false);
  // chosen ones not on the page first, then the page
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
          // a failed page leaves the list as it was
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

  reload(): void {
    this.asked.next({ term: '', next: null });
  }

  search(term: string): void {
    this.typed.next(term);
  }

  more(): void {
    if (!this.loading() && this.next) this.asked.next({ term: this.term, next: this.next });
  }

  clear(): void {
    this.loaded.set([]);
    this.next = null;
    this.hasMore.set(false);
  }

  // unseen ids are read one by one to be named
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
