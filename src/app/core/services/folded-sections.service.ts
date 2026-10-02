import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import { AuthStoreActions } from '../../store/auth';

/**
 * Which foldable parts of a page are open, by name — History's status graph, a task's description.
 * Kept while the app is open: a person who folded a part on one item does not want it back on the
 * next one. A part never folded is open.
 */
@Injectable({ providedIn: 'root' })
export class FoldedSectionsService {
  private readonly sections = new Map<string, WritableSignal<boolean>>();

  constructor() {
    // The next person to sign in on this tab starts with everything open, not with the last one's view.
    inject(Actions)
      .pipe(ofType(AuthStoreActions.logoutCompleted))
      .subscribe(() => this.sections.forEach((open) => open.set(true)));
  }

  /** The open state of one part, to bind two-way to `app-collapsible-section`. */
  open(name: string): WritableSignal<boolean> {
    let open = this.sections.get(name);
    if (!open) {
      open = signal(true);
      this.sections.set(name, open);
    }
    return open;
  }
}
