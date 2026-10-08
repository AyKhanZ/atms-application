import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import { AuthStoreActions } from '../../store/auth';

// folded parts by name, kept while the app is open so the next item opens the same way
@Injectable({ providedIn: 'root' })
export class FoldedSectionsService {
  private readonly sections = new Map<string, WritableSignal<boolean>>();

  constructor() {
    // next user on this tab starts with everything open
    inject(Actions)
      .pipe(ofType(AuthStoreActions.logoutCompleted))
      .subscribe(() => this.sections.forEach((open) => open.set(true)));
  }

  open(name: string): WritableSignal<boolean> {
    let open = this.sections.get(name);
    if (!open) {
      open = signal(true);
      this.sections.set(name, open);
    }
    return open;
  }
}
