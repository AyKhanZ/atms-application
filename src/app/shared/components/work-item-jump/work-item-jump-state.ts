import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, timer } from 'rxjs';
import { WorkItemJumpItem } from './work-item-jump-item';
import { WorkItemJumpPage } from './work-item-jump-page';
import { matchesJumpSearch } from './work-item-jump-search';

export type WorkItemJumpLoader = (search: string, cursor?: string) => Observable<WorkItemJumpPage>;

/** One instance per Location. Keeps server search mode fixed by the unfiltered first page. */
@Injectable()
export class WorkItemJumpState {
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private debounce?: Subscription;
  private loader?: WorkItemJumpLoader;
  private cursor?: string;
  private failedCursor?: string;
  private readonly loaded = signal<WorkItemJumpItem[]>([]);
  readonly term = signal('');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly initialized = signal(false);
  readonly serverSearch = signal(false);
  readonly hasMore = signal(false);
  readonly items = computed(() => {
    const term = this.term();
    return this.serverSearch() || !term
      ? this.loaded()
      : this.loaded().filter((item) => matchesJumpSearch(item, term));
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cancel());
  }

  configure(loader: WorkItemJumpLoader): void {
    this.cancel();
    this.loader = loader;
    this.loaded.set([]);
    this.term.set('');
    this.initialized.set(false);
    this.serverSearch.set(false);
    this.hasMore.set(false);
    this.cursor = undefined;
    this.fetch();
  }

  search(value: string): void {
    if (!this.initialized()) return;
    this.term.set(value.trim());
    if (!this.serverSearch()) return;
    this.cancel();
    this.loaded.set([]);
    this.hasMore.set(false);
    this.cursor = undefined;
    this.error.set(false);
    this.loading.set(true);
    this.debounce = timer(300).subscribe(() => this.fetch());
  }

  loadMore(): void {
    if (!this.loading() && this.hasMore() && this.cursor) this.fetch(this.cursor);
  }

  retry(): void {
    if (!this.loading()) this.fetch(this.failedCursor);
  }

  private cancel(): void {
    this.request?.unsubscribe();
    this.debounce?.unsubscribe();
  }

  private fetch(cursor?: string): void {
    if (!this.loader) return;
    this.loading.set(true);
    this.error.set(false);
    this.failedCursor = cursor;
    this.request = this.loader(this.term(), cursor).subscribe({
      next: (page) => {
        if (!this.initialized()) {
          this.serverSearch.set(page.hasMore);
          this.initialized.set(true);
        }
        const merged = cursor ? [...this.loaded(), ...page.items] : page.items;
        this.loaded.set([...new Map(merged.map((item) => [item.id, item])).values()]);
        this.cursor = page.nextCursor ?? undefined;
        this.hasMore.set(page.hasMore && !!this.cursor);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
