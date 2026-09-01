import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { filter, fromEvent, interval, map, merge, Observable, throttleTime } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VisiblePageRefreshService {
  /**
   * Polling cadence while a page sits open. Callers use this to re-check data that can change
   * from outside the current session, such as project permissions. Those change rarely, so the
   * interval trades staleness for a much quieter network log.
   */
  private static readonly defaultIntervalMs = 180_000;

  /**
   * Collapses bursts. `visibilitychange` fires on every alt-tab, on opening or closing
   * devtools, and on minimising the window, so without this a user switching between two tabs
   * produces a request per switch.
   */
  private static readonly minGapMs = 15_000;

  private readonly document = inject(DOCUMENT);

  every(intervalMs = VisiblePageRefreshService.defaultIntervalMs): Observable<void> {
    return merge(
      interval(intervalMs).pipe(filter(() => this.isVisible())),
      fromEvent(this.document, 'visibilitychange').pipe(filter(() => this.isVisible())),
    ).pipe(
      throttleTime(VisiblePageRefreshService.minGapMs, undefined, {
        leading: true,
        trailing: false,
      }),
      map(() => void 0),
    );
  }

  private isVisible(): boolean {
    return this.document.visibilityState === 'visible';
  }
}
