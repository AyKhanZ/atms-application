import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { filter } from 'rxjs';
import { AuthStoreActions } from '../../store/auth';

/** Pass as navigation state to take the current page's place instead of stacking on top of it. */
export interface NavigationHistoryState {
  replaceHistory?: boolean;
}

/**
 * Route data key. Pages outside the working app — sign-in, onboarding, error pages — are not
 * places Back should lead to, so they are left out of the history.
 */
export const skipNavigationHistory = 'skipNavigationHistory';

/**
 * Route data key for a form. A form is a step on the way somewhere, not a place to come back to:
 * the page it leads to takes its place, so Back after saving skips it.
 */
export const transientInHistory = 'transientInHistory';

interface Entry {
  path: string;
  url: string;
  transient: boolean;
}

const limit = 50;

/**
 * The pages the user went through, so Back returns where they came from rather than to the item's
 * parent. Search, the recent list and links jump across the tree, and walking back up it one
 * level at a time took three presses to reach the page the user had left.
 *
 * One entry per page, not per URL: switching a tab or a filter changes the query, and Back should
 * leave the page, not replay its tabs.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private entries: Entry[] = [];

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.record(event.urlAfterRedirects));

    // The next person to sign in on this tab must not step back into the last one's pages.
    inject(Actions)
      .pipe(ofType(AuthStoreActions.logoutCompleted))
      .subscribe(() => (this.entries = []));
  }

  /**
   * Goes to the page before this one. Returns false when there is none — the page was opened
   * from a link or after a reload — so the caller can fall back to the item's parent.
   */
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

    // The same page with another tab or filter: remember where it was left, but as one stop.
    if (last?.path === entry.path) {
      this.entries[this.entries.length - 1] = entry;
      return;
    }

    // A sibling picked in the switcher, the page an item was deleted from, or a form left behind:
    // this page stands in for the last one, so Back skips it.
    if (last && (state?.replaceHistory || last.transient)) this.entries.pop();

    // Back on a page already passed through — by this service, a form's Cancel or the browser —
    // cuts the stack there, so the next Back goes further back rather than bouncing between two.
    const seen = this.entries.map((item) => item.path).lastIndexOf(entry.path);
    if (seen >= 0) this.entries = this.entries.slice(0, seen);

    this.entries = [...this.entries, entry].slice(-limit);
  }
}

function deepest(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return route.firstChild ? deepest(route.firstChild) : route;
}
