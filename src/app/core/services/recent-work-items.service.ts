import { Injectable, inject } from '@angular/core';
import { WorkItemKind } from '../models/work-items';
import { GlobalSearchService } from './global-search.service';

// fire and forget: the page doesnt wait and a lost entry costs nothing, errors are swallowed
@Injectable({ providedIn: 'root' })
export class RecentWorkItemsService {
  private readonly search = inject(GlobalSearchService);

  track(itemType: WorkItemKind, itemId: string): void {
    this.search.recordRecent(itemType, itemId).subscribe({ error: () => undefined });
  }
}
