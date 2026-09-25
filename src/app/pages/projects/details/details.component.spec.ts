import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { EMPTY, of } from 'rxjs';
import { BreadcrumbOverrideService } from '../../../core/services/breadcrumb-override.service';
import { NavigationHistoryService } from '../../../core/services/navigation-history.service';
import { ProjectPermissionsRefreshService } from '../../../core/services/project-permissions-refresh.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { RecentWorkItemsService } from '../../../core/services/recent-work-items.service';
import { VisiblePageRefreshService } from '../../../core/services/visible-page-refresh.service';
import { WorkGroupExpansionStateService } from './tabs/groups/work-group-expansion-state.service';
import { parseProjectTab, ProjectDetailsComponent, projectTabQueryParam } from './details.component';

describe('parseProjectTab', () => {
  it.each(['stakeholders', 'attachments', 'history'] as const)('accepts the %s deep link', (tab) =>
    expect(parseProjectTab(tab)).toBe(tab),
  );

  it.each(['plan', 'links'])('maps the %s query parameter to groups', (tab) => {
    expect(parseProjectTab(tab)).toBe('groups');
  });

  it.each([null, '', 'unknown', 'Details'])('falls back to details for %s', (tab) =>
    expect(parseProjectTab(tab)).toBe('details'),
  );
});

describe('projectTabQueryParam', () => {
  it('keeps plan as the public query parameter for the groups tab', () => {
    expect(projectTabQueryParam('groups')).toBe('plan');
  });

  it('removes the query parameter for details', () => {
    expect(projectTabQueryParam('details')).toBeNull();
  });
});

describe('ProjectDetailsComponent realtime membership', () => {
  it('joins the viewed project and leaves it when the page closes', () => {
    const realtime = {
      joinProject: vi.fn().mockResolvedValue(undefined),
      leaveProject: vi.fn().mockResolvedValue(undefined),
    };
    const breadcrumb = { set: vi.fn(), clear: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: RealtimeService, useValue: realtime },
        { provide: ActivatedRoute, useValue: {
          snapshot: { paramMap: convertToParamMap({ projectId: 'project-1' }) },
          queryParamMap: of(convertToParamMap({})),
        } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: Store, useValue: { selectSignal: () => signal(null), dispatch: vi.fn() } },
        { provide: Actions, useValue: EMPTY },
        { provide: ConfirmationService, useValue: {} },
        { provide: WorkGroupExpansionStateService, useValue: { set: vi.fn() } },
        { provide: ProjectPermissionsRefreshService, useValue: { watch: () => EMPTY } },
        { provide: VisiblePageRefreshService, useValue: { onReturn: () => EMPTY } },
        { provide: BreadcrumbOverrideService, useValue: breadcrumb },
        { provide: RecentWorkItemsService, useValue: { track: vi.fn() } },
        { provide: NavigationHistoryService, useValue: {} },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new ProjectDetailsComponent());
    expect(realtime.joinProject).toHaveBeenCalledExactlyOnceWith('project-1');

    component.ngOnDestroy();
    expect(realtime.leaveProject).toHaveBeenCalledExactlyOnceWith('project-1');
  });
});
