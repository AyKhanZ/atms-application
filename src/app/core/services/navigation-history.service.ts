import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { filter } from 'rxjs';
import { AuthStoreActions } from '../../store/auth';

// replace the current page instead of stacking on top
export interface NavigationHistoryState {
  replaceHistory?: boolean;
}

// sign-in, onboarding and error pages are not places to go Back to
export const skipNavigationHistory = 'skipNavigationHistory';

// forms are a step, not a place: Back after saving skips them
export const transientInHistory = 'transientInHistory';

interface Entry {
  path: string;
  url: string;
  transient: boolean;
}

const limit = 50;

// pages the user went through, so Back goes where they came from, not to the parent
// one entry per page, not per url: tabs and filters change the query
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private entries: Entry[] = [];

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.record(event.urlAfterRedirects));

    // next user on this tab cant step back into the last ones pages
    inject(Actions)
      .pipe(ofType(AuthStoreActions.logoutCompleted))
      .subscribe(() => (this.entries = []));
  }

  // false when there is no page before (opened by link or reload), caller falls back to parent
  back(): boolean {
    const previous = this.entries[this.entries.length - 2];
    if (!previous) return false;
    void this.router.navigateByUrl(previous.url);
    return true;
  }

  private record(url: string): void {
    const data = deepest(this.router.routerState.snapshot.root).data;
    if (data[skipNavigationHistory]) return;

    const entry: Entry = {
      path: url.split(/[?#]/)[0],
      url,
      transient: data[transientInHistory] === true,
    };
    const state = this.router.lastSuccessfulNavigation()?.extras.state as
      | NavigationHistoryState
      | undefined;
    const last = this.entries[this.entries.length - 1];

    // same page, another tab or filter: one stop
    if (last?.path === entry.path) {
      this.entries[this.entries.length - 1] = entry;
      return;
    }

    // switcher sibling, deleted item page or left form: replaces the last entry
    if (last && (state?.replaceHistory || last.transient)) this.entries.pop();

    // back on a page already passed: cut the stack there so Back doesnt bounce between two
    const seen = this.entries.map((item) => item.path).lastIndexOf(entry.path);
    if (seen >= 0) this.entries = this.entries.slice(0, seen);

    this.entries = [...this.entries, entry].slice(-limit);
  }
}

function deepest(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return route.firstChild ? deepest(route.firstChild) : route;
}
