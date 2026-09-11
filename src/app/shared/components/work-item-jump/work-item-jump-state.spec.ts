import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { WorkItemJumpState } from './work-item-jump-state';
import { WorkItemJumpPage } from './work-item-jump-page';

const item = (id: string, title = id) => ({ id, code: id, title });
const page = (ids: string[], hasMore = false, nextCursor?: string): WorkItemJumpPage => ({
  items: ids.map((id) => item(id)),
  hasMore,
  nextCursor,
});

describe('WorkItemJumpState', () => {
  let state: WorkItemJumpState;
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [WorkItemJumpState] });
    state = TestBed.inject(WorkItemJumpState);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('loads only the first page and searches a complete sibling set locally', () => {
    const loader = vi.fn(() => of(page(['Alpha', 'Beta'])));
    state.configure(loader);
    state.search(' ALPHA ');
    expect(state.items().map((x) => x.id)).toEqual(['Alpha']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('debounces server search and finds an item outside the first 50', () => {
    const loader = vi.fn((search: string) =>
      of(
        search
          ? page(['Ticket 501'])
          : page(
              Array.from({ length: 50 }, (_, index) => String(index)),
              true,
              'next',
            ),
      ),
    );
    state.configure(loader);
    expect(loader).toHaveBeenCalledTimes(1);
    state.search('50');
    vi.advanceTimersByTime(200);
    state.search('501');
    vi.advanceTimersByTime(299);
    expect(loader).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(loader).toHaveBeenLastCalledWith('501', undefined);
    expect(state.items()[0].id).toBe('Ticket 501');
    state.search('different');
    vi.advanceTimersByTime(300);
    expect(loader).toHaveBeenLastCalledWith('different', undefined);
    expect(state.serverSearch()).toBe(true);
  });

  it('cancels obsolete searches immediately and resets the cursor', () => {
    const stale = new Subject<WorkItemJumpPage>();
    const loader = vi.fn((search: string) =>
      search === 'old' ? stale : of(page([search || 'first'], !search, 'next')),
    );
    state.configure(loader);
    state.search('old');
    vi.advanceTimersByTime(300);
    state.search('new');
    expect(stale.observed).toBe(false);
    stale.next(page(['stale']));
    vi.advanceTimersByTime(300);
    expect(state.items().map((x) => x.id)).toEqual(['new']);
    expect(loader).toHaveBeenLastCalledWith('new', undefined);
  });

  it('loads more on demand and deduplicates boundary rows', () => {
    const loader = vi.fn((_search: string, cursor?: string) =>
      of(cursor ? page(['1', '2']) : page(['1'], true, 'next')),
    );
    state.configure(loader);
    state.loadMore();
    expect(loader).toHaveBeenLastCalledWith('', 'next');
    expect(state.items().map((x) => x.id)).toEqual(['1', '2']);
    expect(state.hasMore()).toBe(false);
  });

  it('retries a failed page without losing previously loaded items', () => {
    let fail = true;
    const loader = vi.fn((_search: string, cursor?: string) => {
      if (!cursor) return of(page(['1'], true, 'next'));
      return fail ? throwError(() => new Error('offline')) : of(page(['2']));
    });
    state.configure(loader);
    state.loadMore();
    expect(state.error()).toBe(true);
    expect(state.items()).toHaveLength(1);
    fail = false;
    state.retry();
    expect(state.items()).toHaveLength(2);
    expect(state.error()).toBe(false);
  });

  it('cancels a pending request when the sibling scope changes', () => {
    const stale = new Subject<WorkItemJumpPage>();
    state.configure(() => stale);
    state.configure(() => of(page(['new-scope'])));
    expect(stale.observed).toBe(false);
    expect(state.items()[0].id).toBe('new-scope');
    expect(state.term()).toBe('');
  });
});
