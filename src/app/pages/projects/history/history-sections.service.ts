import { Injectable, inject, signal } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import { AuthStoreActions } from '../../../store/auth';

/**
 * Which parts of a History tab are open. Shared by every History tab while the app is open: a
 * person who folded the status graph on one task does not want it back on the next one.
 */
@Injectable({ providedIn: 'root' })
export class HistorySectionsService {
  readonly statesOpen = signal(true);
  readonly entriesOpen = signal(true);

  constructor() {
    // The next person to sign in on this tab starts with everything open, not with the last one's view.
    inject(Actions)
      .pipe(ofType(AuthStoreActions.logoutCompleted))
      .subscribe(() => {
        this.statesOpen.set(true);
        this.entriesOpen.set(true);
      });
  }

  toggleStates(): void {
    this.statesOpen.update((open) => !open);
  }

  toggleEntries(): void {
    this.entriesOpen.update((open) => !open);
  }
}
