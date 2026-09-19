import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { projectApiUrl } from '../../core/constants/api-url.constants';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { WorkItemKind } from '../../core/models/work-items';
import { SearchComponent } from './search.component';
import { Features } from '../../store/features.enum';
import { GlobalSearchEffects } from '../../store/global-search/global-search.effects';
import { globalSearchReducer } from '../../store/global-search/global-search.reducer';

@Component({ template: '' })
class ElsewhereComponent {}

function page(items: { id: string }[], nextCursor: string | null) {
  return {
    items: items.map((item) => ({
      ...item,
      itemType: WorkItemKind.Task,
      code: item.id,
      title: 'Result ' + item.id,
      project: { id: 'p7', code: '7', name: 'Project' },
      status: { id: 1, code: 'New', name: 'New' },
    })),
    nextCursor,
    hasMore: nextCursor !== null,
    pageSize: 20,
  };
}

describe('SearchComponent', () => {
  let http: HttpTestingController;

  async function open(query = 'плат') {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'search', component: SearchComponent },
          { path: 'projects/:id', component: ElsewhereComponent },
          { path: 'dashboard', component: ElsewhereComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideStore({ [Features.GlobalSearch]: globalSearchReducer }),
        provideEffects(GlobalSearchEffects),
      ],
    });
    http = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create(`/search?q=${query}&type=3`);
    return harness.routeDebugElement!.componentInstance as SearchComponent;
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('asks for the first page from the address', async () => {
    const component = await open();

    const request = http.expectOne((value) => value.url === `${projectApiUrl}/search/task`);
    expect(request.request.params.get('q')).toBe('плат');
    request.flush(page([{ id: '1' }], null));

    expect(component.items()).toHaveLength(1);
    expect(component.hasMore()).toBe(false);
  });

  it('appends the next page and never asks twice for the same cursor', async () => {
    const component = await open();
    http
      .expectOne((value) => value.url === `${projectApiUrl}/search/task`)
      .flush(page([{ id: '1' }], 'cursor-1'));

    component.loadMore();
    // A second call while the first is still running — a fast scroll does exactly this.
    component.loadMore();

    const next = http.expectOne((value) => value.params.get('cursor') === 'cursor-1');
    next.flush(page([{ id: '2' }], null));

    expect(component.items().map((item) => item.id)).toEqual(['1', '2']);
    expect(component.hasMore()).toBe(false);
  });

  it('does nothing more once the last page has arrived', async () => {
    const component = await open();
    http
      .expectOne((value) => value.url === `${projectApiUrl}/search/task`)
      .flush(page([{ id: '1' }], null));

    component.loadMore();

    http.expectNone(() => true);
  });

  /* Typing must not put a request on the wire per letter: this is the most expensive query in
     the system and the field is used by typing into it. */
  it('waits for a pause in typing before asking again', async () => {
    const component = await open();
    http
      .expectOne((value) => value.url === `${projectApiUrl}/search/task`)
      .flush(page([{ id: '1' }], null));

    component.changeQuery('пла');
    component.changeQuery('плат');
    component.changeQuery('платеж');

    // The field already shows what was typed, but nothing has been asked for yet.
    expect(component.query()).toBe('платеж');
    http.expectNone(() => true);

    await vi.advanceTimersByTimeAsync(300);

    const request = http.expectOne((value) => value.params.get('q') === 'платеж');
    request.flush(page([{ id: '9' }], null));
    expect(component.items().map((item) => item.id)).toEqual(['9']);
  });

  it('reports a failed page and retries the same cursor', async () => {
    const component = await open();
    http
      .expectOne((value) => value.url === `${projectApiUrl}/search/task`)
      .error(new ProgressEvent('failed'));

    expect(component.failed()).toBe(true);

    component.retry();
    http
      .expectOne((value) => value.url === `${projectApiUrl}/search/task`)
      .flush(page([{ id: '1' }], null));

    expect(component.failed()).toBe(false);
    expect(component.items()).toHaveLength(1);
  });

  it('goes back to the page the search was opened from', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'search', component: SearchComponent },
          { path: 'projects/:id', component: ElsewhereComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideStore({ [Features.GlobalSearch]: globalSearchReducer }),
        provideEffects(GlobalSearchEffects),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    // Started with the app in real use, so it sees the page the search was opened from.
    TestBed.inject(NavigationHistoryService);
    const harness = await RouterTestingHarness.create('/projects/p7');
    const component = await harness.navigateByUrl('/search?q=плат&type=3', SearchComponent);
    http.expectOne((value) => value.url === `${projectApiUrl}/search/task`).flush(page([], null));

    // Switching the kind stays on the page and must not become where back leads.
    component.changeType(WorkItemKind.Ticket);
    await harness.fixture.whenStable();
    http.expectOne((value) => value.url === `${projectApiUrl}/search/ticket`).flush(page([], null));

    component.back();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/projects/p7');
  });

  // Opened from a pasted link there is nothing behind the page, so back leads to the dashboard.
  it('goes to the dashboard when there is nowhere to go back to', async () => {
    const component = await open();
    http.expectOne((value) => value.url === `${projectApiUrl}/search/task`).flush(page([], null));

    component.back();
    await TestBed.inject(Router).navigated;
    await vi.advanceTimersByTimeAsync(1);

    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });
});
