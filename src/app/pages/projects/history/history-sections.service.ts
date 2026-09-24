import { Injectable, signal } from '@angular/core';

/**
 * Which parts of a History tab are open. Shared by every History tab while the app is open: a
 * person who folded the status graph on one task does not want it back on the next one.
 */
@Injectable({ providedIn: 'root' })
export class HistorySectionsService {
  readonly statesOpen = signal(true);
  readonly entriesOpen = signal(true);

  toggleStates(): void {
    this.statesOpen.update((open) => !open);
  }

  toggleEntries(): void {
    this.entriesOpen.update((open) => !open);
  }
}
