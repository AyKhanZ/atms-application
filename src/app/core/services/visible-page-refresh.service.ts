import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { filter, fromEvent, interval, map, merge, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VisiblePageRefreshService {
  private static readonly defaultIntervalMs = 30_000;

  private readonly document = inject(DOCUMENT);

  every(intervalMs = VisiblePageRefreshService.defaultIntervalMs): Observable<void> {
    return merge(
      interval(intervalMs).pipe(filter(() => this.isVisible())),
      fromEvent(this.document, 'visibilitychange').pipe(filter(() => this.isVisible())),
    ).pipe(map(() => void 0));
  }

  private isVisible(): boolean {
    return this.document.visibilityState === 'visible';
  }
}
