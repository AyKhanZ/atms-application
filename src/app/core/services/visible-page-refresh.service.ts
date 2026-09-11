import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { filter, fromEvent, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VisiblePageRefreshService {
  /**
   * Minimum gap between refreshes. `visibilitychange` fires on every alt-tab, on opening or
   * closing devtools and on minimising the window, so without this a user switching between two
   * tabs produces a request per switch.
   */
  private static readonly defaultMinGapMs = 600_000;

  private readonly document = inject(DOCUMENT);
  private lastEmittedAt = new Map<string, number>();

  /**
   * Emits when the user comes back to an already open page, never on a timer.
   *
   * There used to be an `interval()` here as well. It was removed: project structure and project
   * permissions change rarely, the user's own changes already trigger a reload, and the backend
   * checks permissions on every request anyway — so polling cost requests without buying
   * freshness anyone could notice.
   *
   * @param key identifies the caller so two watchers do not consume each other's gap.
   */
  onReturn(key: string, minGapMs = VisiblePageRefreshService.defaultMinGapMs): Observable<void> {
    return fromEvent(this.document, 'visibilitychange').pipe(
      filter(() => this.isVisible()),
      filter(() => this.hasGapElapsed(key, minGapMs)),
      map(() => void 0),
    );
  }

  private hasGapElapsed(key: string, minGapMs: number): boolean {
    const now = Date.now();
    const last = this.lastEmittedAt.get(key);
    if (last !== undefined && now - last < minGapMs) return false;

    this.lastEmittedAt.set(key, now);

    return true;
  }

  private isVisible(): boolean {
    return this.document.visibilityState === 'visible';
  }
}
