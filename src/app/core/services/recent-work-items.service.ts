import { Injectable, inject } from '@angular/core';
import { WorkItemKind } from '../models/work-items';
import { GlobalSearchService } from './global-search.service';

/**
 * Remembers what the current user opened, so the search box can offer it back before a single
 * letter is typed.
 *
 * Fire and forget on purpose: the page must not wait for it, and an entry that never got written
 * costs nothing. Failures are swallowed for the same reason — there is nothing for the reader to
 * do about them.
 */
@Injectable({ providedIn: 'root' })
export class RecentWorkItemsService {
  private readonly search = inject(GlobalSearchService);

  track(itemType: WorkItemKind, itemId: string): void {
    this.search.recordRecent(itemType, itemId).subscribe({ error: () => undefined });
  }
}
