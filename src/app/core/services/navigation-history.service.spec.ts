import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { AuthStoreActions } from '../../store/auth';
import {
  NavigationHistoryService,
  skipNavigationHistory,
  transientInHistory,
} from './navigation-history.service';

@Component({ template: '' })
class BlankComponent {}

describe('NavigationHistoryService', () => {
  let router: Router;
  let history: NavigationHistoryService;
  let actions: Subject<Action>;

  beforeEach(() => {
    actions = new Subject<Action>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', data: { [skipNavigationHistory]: true }, component: BlankComponent },
          {
            path: 'projects/:p/tickets/:t/tasks/create',
            data: { [transientInHistory]: true },
            component: BlankComponent,
          },
          { path: '**', component: BlankComponent },
        ]),
        provideMockActions(() => actions),
      ],
    });
    router = TestBed.inject(Router);
    history = TestBed.inject(NavigationHistoryService);
  });

  const go = (url: string, state?: object) => router.navigateByUrl(url, { state });
  const back = async () => {
    const went = history.back();
    await TestBed.inject(Router).navigated;
    await new Promise((resolve) => setTimeout(resolve));
    return went;
  };

  /* The case that took three presses: a task opened from search went up to its ticket, then the
     project, and only then to the page the user had left. */
  it('returns to the page the user came from, not to the parent', async () => {
    await go('/projects?page=2');
    await go('/projects/p/tickets/t/tasks/a');

    expect(await back()).toBe(true);
    expect(router.url).toBe('/projects?page=2');
  });

  it('says there is nowhere to go on the first page, so the caller can go to the parent', async () => {
    await go('/projects/p/tickets/t/tasks/a');

    expect(await back()).toBe(false);
  });

  it('leaves the page instead of stepping back through its tabs', async () => {
    await go('/dashboard');
    await go('/projects/p/tickets/t');
    await go('/projects/p/tickets/t?tab=tasks');
    await go('/projects/p/tickets/t?tab=history');

    await back();
    expect(router.url).toBe('/dashboard');
  });

  it('comes back to a page with the tab it was left on', async () => {
    await go('/projects/p/tickets/t?tab=tasks');
    await go('/projects/p/tickets/t/tasks/a');

    await back();
    expect(router.url).toBe('/projects/p/tickets/t?tab=tasks');
  });

  it('skips a sibling picked in the switcher', async () => {
    await go('/search?q=pay');
    await go('/projects/p/tickets/t/tasks/a');
    await go('/projects/p/tickets/t/tasks/b', { replaceHistory: true });

    await back();
    expect(router.url).toBe('/search?q=pay');
  });

  it('does not come back to a form after it was saved', async () => {
    await go('/projects/p/tickets/t?tab=tasks');
    await go('/projects/p/tickets/t/tasks/create');
    await go('/projects/p/tickets/t/tasks/new');

    await back();
    expect(router.url).toBe('/projects/p/tickets/t?tab=tasks');
  });

  it('does not bounce between two pages', async () => {
    await go('/dashboard');
    await go('/projects');
    await go('/projects/p');

    await back();
    expect(router.url).toBe('/projects');
    await back();
    expect(router.url).toBe('/dashboard');
  });

  /* Signing out and in again on the same tab used to leave the previous session's pages, and the
     sign-in page itself, as places Back could lead to. */
  it('forgets the pages of a session that ended', async () => {
    await go('/projects/p');
    await go('/projects/p/tickets/t');
    actions.next(AuthStoreActions.logoutCompleted());
    await go('/login');
    await go('/projects/p/tickets/t/tasks/a');

    expect(await back()).toBe(false);
  });

  it('does not lead back to the sign-in page', async () => {
    await go('/login');
    await go('/projects/p/tickets/t/tasks/a');

    expect(await back()).toBe(false);
  });
});
