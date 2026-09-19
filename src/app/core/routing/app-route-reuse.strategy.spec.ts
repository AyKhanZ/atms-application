import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouteReuseStrategy, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppRouteReuseStrategy, recreateOnParamChange } from './app-route-reuse.strategy';

let created = 0;

@Component({ template: '' })
class PageComponent {
  constructor() {
    created++;
  }
}

describe('AppRouteReuseStrategy', () => {
  beforeEach(() => {
    created = 0;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'projects/:projectId',
            data: { [recreateOnParamChange]: true },
            component: PageComponent,
          },
          { path: 'tasks/:taskId', component: PageComponent },
          {
            path: 'projects/:projectId/tickets/:ticketId',
            data: { [recreateOnParamChange]: ['projectId'] },
            component: PageComponent,
          },
        ]),
        { provide: RouteReuseStrategy, useClass: AppRouteReuseStrategy },
      ],
    });
  });

  /* Search and the recent list move straight from one project to another. The page used to stay
     and keep showing the first project under the second one's address. */
  it('opens a fresh page for another id on a route that asks for it', async () => {
    const harness = await RouterTestingHarness.create('/projects/a');
    await harness.navigateByUrl('/projects/b');

    expect(created).toBe(2);
  });

  it('keeps the page when only the query changes', async () => {
    const harness = await RouterTestingHarness.create('/projects/a');
    await TestBed.inject(Router).navigateByUrl('/projects/a?tab=plan');
    harness.detectChanges();

    expect(created).toBe(1);
  });

  it('keeps reusing pages that follow their parameters themselves', async () => {
    const harness = await RouterTestingHarness.create('/tasks/a');
    await harness.navigateByUrl('/tasks/b');

    expect(created).toBe(1);
  });

  /* A ticket follows its own id, but not its project's: a ticket of another project was asked
     for under the old project id and showed as unavailable. */
  it('opens a fresh page only when a watched parameter changes', async () => {
    const harness = await RouterTestingHarness.create('/projects/a/tickets/1');
    await harness.navigateByUrl('/projects/a/tickets/2');
    expect(created).toBe(1);

    await harness.navigateByUrl('/projects/b/tickets/3');
    expect(created).toBe(2);
  });
});
