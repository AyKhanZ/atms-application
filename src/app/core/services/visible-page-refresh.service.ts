import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { filter, fromEvent, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VisiblePageRefreshService {
  // visibilitychange fires on every alt-tab and devtools toggle, without a gap every switch is a request
  private static readonly defaultMinGapMs = 600_000;

  private readonly document = inject(DOCUMENT);
  private lastEmittedAt = new Map<string, number>();

  // only when the user comes back to the page, no timer
  // key = caller, so two watchers dont eat each others gap
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
