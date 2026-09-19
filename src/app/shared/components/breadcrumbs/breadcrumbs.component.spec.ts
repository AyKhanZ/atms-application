import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { BreadcrumbOverrideService } from '../../../core/services/breadcrumb-override.service';
import { BreadcrumbsComponent } from './breadcrumbs.component';

@Component({ template: '' })
class DummyPageComponent {}

const routes: Routes = [
  {
    path: 'projects',
    data: { breadcrumb: { title: 'Projects', icon: 'pi-briefcase' } },
    children: [
      { path: '', component: DummyPageComponent },
      { path: ':projectId', component: DummyPageComponent },
      { path: ':projectId/tickets/:ticketId', component: DummyPageComponent },
      {
        path: ':projectId/edit',
        component: DummyPageComponent,
        data: { breadcrumb: { title: 'Edit' } },
      },
    ],
  },
];

async function renderAt(url: string) {
  await TestBed.configureTestingModule({
    imports: [BreadcrumbsComponent],
    providers: [provideRouter(routes)],
  }).compileComponents();

  await TestBed.inject(Router).navigateByUrl(url);

  const overrides = TestBed.inject(BreadcrumbOverrideService);
  const fixture = TestBed.createComponent(BreadcrumbsComponent);
  fixture.detectChanges();

  return { fixture, overrides, element: fixture.nativeElement as HTMLElement };
}

function titles(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.crumb__title')].map(
    (node) => node.textContent?.trim() ?? '',
  );
}

describe('BreadcrumbsComponent', () => {
  it('falls back to the static route title when nothing is registered', async () => {
    const { fixture } = await renderAt('/projects');

    expect(fixture.componentInstance.breadcrumbs().map((crumb) => crumb.title)).toEqual([
      'Projects',
    ]);
  });

  it('draws nothing when the trail is one level deep', async () => {
    const { element } = await renderAt('/projects');

    // A lone level repeats the page title one line above it, so there is nothing to draw.
    expect(titles(element)).toEqual([]);
  });

  it('renders a registered title for a dynamic segment', async () => {
    const { fixture, overrides, element } = await renderAt('/projects/p7');

    overrides.set('/projects/p7', '#7 Payment Gateway Integration');
    fixture.detectChanges();

    expect(titles(element)).toEqual(['Projects', '#7 Payment Gateway Integration']);
  });

  it('surfaces a crumb per level of a compound route', async () => {
    const { fixture, overrides, element } = await renderAt('/projects/p7/tickets/t29');

    overrides.set('/projects/p7', '#7 Payment Gateway Integration');
    overrides.set('/projects/p7/tickets/t29', '#29 Ticket title');
    fixture.detectChanges();

    expect(titles(element)).toEqual([
      'Projects',
      '#7 Payment Gateway Integration',
      '#29 Ticket title',
    ]);
  });

  it('skips intermediate segments that carry no title', async () => {
    const { fixture, overrides, element } = await renderAt('/projects/p7/tickets/t29');

    overrides.set('/projects/p7/tickets/t29', '#29 Ticket title');
    fixture.detectChanges();

    // "/projects/p7" and "/projects/p7/tickets" have no title, so neither becomes a crumb.
    expect(titles(element)).toEqual(['Projects', '#29 Ticket title']);
  });

  it('links every ancestor and leaves the current page as plain text', async () => {
    const { fixture, overrides, element } = await renderAt('/projects/p7/tickets/t29');

    overrides.set('/projects/p7', '#7 Payment Gateway Integration');
    overrides.set('/projects/p7/tickets/t29', '#29 Ticket title');
    fixture.detectChanges();

    expect(element.querySelectorAll('a.crumb__link')).toHaveLength(2);

    const current = element.querySelector('[aria-current="page"]');
    expect(current?.tagName).toBe('SPAN');
    expect(current?.textContent).toContain('#29 Ticket title');
  });

  it('keeps a static route title as the final crumb', async () => {
    const { fixture, overrides, element } = await renderAt('/projects/p7/edit');

    overrides.set('/projects/p7', '#7 Payment Gateway Integration');
    fixture.detectChanges();

    expect(titles(element)).toEqual(['Projects', '#7 Payment Gateway Integration', 'Edit']);
  });
});

describe('BreadcrumbsComponent form context', () => {
  it('uses selected parent links and clears the temporary trail', async () => {
    const { fixture, overrides, element } = await renderAt('/projects/p7/edit');
    overrides.setTrail('/projects/p7/edit', [
      { title: 'Projects', path: '/projects' },
      { title: 'Selected ticket', path: '/projects/p7/tickets/other' },
    ]);
    fixture.detectChanges();
    expect(titles(element)).toEqual(['Projects', 'Selected ticket']);
    expect(element.querySelector('a[href="/projects/p7/tickets/other"]')).not.toBeNull();
    overrides.clearTrail('/projects/p7/edit');
    fixture.detectChanges();
    expect(titles(element)).toEqual(['Projects', 'Edit']);
  });

  it('ignores a temporary trail owned by another route', async () => {
    const { fixture, overrides } = await renderAt('/projects');
    overrides.setTrail('/projects/p7/edit', [{ title: 'Other page', path: '/projects/p7' }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.breadcrumbs().map((crumb) => crumb.title)).toEqual([
      'Projects',
    ]);
  });
});
