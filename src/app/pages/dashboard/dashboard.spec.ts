import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, ParamMap, Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { NEVER, Subject } from 'rxjs';
import { DashboardModel } from '../../core/models/dashboard';
import { VisiblePageRefreshService } from '../../core/services/visible-page-refresh.service';
import { Features } from '../../store/features.enum';
import { initialDashboardState } from '../../store/dashboard/dashboard.state';
import { Dashboard } from './dashboard';

const model: DashboardModel = {
  generatedAt: '2026-09-25T10:00:00Z',
  period: '30d',
  from: '2026-08-27',
  to: '2026-09-25',
  granularity: 'day',
  kpis: [{ key: 'done', value: 3 }],
  mainChart: { labels: [], series: [] },
  donuts: [
    { key: 'byStatus', segments: [{ id: 2, label: 'In progress', value: 2 }] },
    { key: 'byPriority', segments: [{ id: 3, label: 'High', value: 2 }] },
  ],
  workload: {
    segments: [
      { kind: 'user', person: { id: 'user-1', name: 'A', surname: 'B' }, value: 2 },
      { kind: 'others', person: null, value: 4 },
      { kind: 'unassigned', person: null, value: 1 },
    ],
  },
  secondaryChart: {
    key: 'byTicket',
    segments: [{ id: 'ticket-1', code: '7', label: 'Ticket', value: 3 }],
  },
  deadlines: [],
  deadlineCount: 0,
  activities: [],
};

describe('Dashboard navigation', () => {
  let fixture: ComponentFixture<Dashboard>;
  let store: MockStore;
  let navigate: ReturnType<typeof vi.fn>;
  let queryParams: Subject<ParamMap>;

  beforeEach(() => {
    const actions = new Subject<Action>();
    queryParams = new Subject<ParamMap>();
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideMockStore({
          initialState: { [Features.Dashboard]: { ...initialDashboardState, active: true, model } },
        }),
        provideMockActions(() => actions),
        { provide: Router, useValue: { navigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ projectId: 'project-1', period: '30d' }),
            },
            queryParamMap: queryParams,
          },
        },
        { provide: VisiblePageRefreshService, useValue: { onReturn: () => NEVER } },
      ],
    });
    TestBed.overrideComponent(Dashboard, { set: { template: '' } });
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    navigate.mockClear();
  });

  afterEach(() => fixture.destroy());

  it('opens all Done tasks with an explicit all-assignees filter', () => {
    fixture.componentInstance.openKpi('done');
    expect(navigate).toHaveBeenCalledWith(['/tasks'], {
      queryParams: {
        view: 'board',
        assignee: '',
        project: 'project-1',
        state: '3',
      },
    });
  });

  it('opens open tasks without an assignee from the Unassigned card', () => {
    fixture.componentInstance.openKpi('unassigned');
    expect(navigate).toHaveBeenCalledWith(['/tasks'], {
      queryParams: {
        view: 'list',
        assignee: 'none',
        project: 'project-1',
        state: '1,2',
      },
    });
  });

  it('opens the date fields for a custom range and loads nothing until Apply', () => {
    const page = fixture.componentInstance;

    page.changePeriod('custom');

    expect(navigate).not.toHaveBeenCalled();
    expect(page.selectedPeriod()).toBe('custom');
    expect(page.customFrom()).toEqual(new Date(2026, 7, 27));
    expect(page.customTo()).toEqual(new Date(2026, 8, 25));
  });

  it('puts an applied custom range in the address', () => {
    const page = fixture.componentInstance;
    page.changePeriod('custom');
    page.customFrom.set(new Date(2026, 8, 1));
    page.customTo.set(new Date(2026, 8, 10));

    page.applyCustom();

    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { projectId: 'project-1', period: 'custom', from: '2026-09-01', to: '2026-09-10' },
    }));
  });

  it('does not let the calendars reach past a year', () => {
    const page = fixture.componentInstance;
    page.changePeriod('custom');
    page.setCustomFrom(new Date(2025, 0, 10));
    page.setCustomTo(null);

    expect(page.toMaxDate()).toEqual(new Date(2026, 0, 10));

    page.setCustomTo(new Date(2025, 5, 1));
    page.setCustomFrom(null);
    expect(page.fromMinDate()).toEqual(new Date(2024, 5, 1));
  });

  it('clears the end when a new start puts it out of reach', () => {
    const page = fixture.componentInstance;
    page.changePeriod('custom');
    page.setCustomTo(new Date(2026, 8, 20));

    page.setCustomFrom(new Date(2025, 0, 1));

    expect(page.customTo()).toBeNull();
    expect(page.customFrom()).toEqual(new Date(2025, 0, 1));
  });

  it('does not apply a reversed range', () => {
    const page = fixture.componentInstance;
    page.changePeriod('custom');
    page.customFrom.set(new Date(2026, 8, 10));
    page.customTo.set(new Date(2026, 8, 1));

    page.applyCustom();

    expect(page.customError()).toBe("The start date can't be after the end date");
    expect(navigate).not.toHaveBeenCalled();
  });

  it('switches back from the custom fields to a named period', () => {
    const page = fixture.componentInstance;
    page.changePeriod('custom');

    page.changePeriod('7d');

    expect(page.editingCustom()).toBe(false);
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { projectId: 'project-1', period: '7d', from: null, to: null },
    }));
  });

  it('restores the applied custom range when the project changes during a draft', () => {
    queryParams.next(convertToParamMap({
      projectId: 'project-1',
      period: 'custom',
      from: '2026-09-05',
      to: '2026-09-12',
    }));
    fixture.detectChanges();
    navigate.mockClear();
    const page = fixture.componentInstance;
    page.changePeriod('custom');
    page.customFrom.set(new Date(2026, 8, 1));
    page.customTo.set(new Date(2026, 8, 10));

    page.changeProject('project-2');

    expect(page.editingCustom()).toBe(false);
    expect(page.customFrom()).toEqual(new Date(2026, 8, 5));
    expect(page.customTo()).toEqual(new Date(2026, 8, 12));
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { projectId: 'project-2', period: 'custom', from: '2026-09-05', to: '2026-09-12' },
    }));
  });

  it('opens all upcoming deadlines in a list sorted by deadline', () => {
    fixture.componentInstance.showAllDeadlines();

    const [, options] = navigate.mock.calls[0];
    expect(navigate.mock.calls[0][0]).toEqual(['/tasks']);
    expect(options.queryParams).toEqual({
      view: 'list',
      assignee: '',
      project: 'project-1',
      state: '1,2',
      sort: '3',
      deadlineFrom: expect.any(String),
      deadlineTo: expect.any(String),
    });
    const from = new Date(options.queryParams.deadlineFrom);
    const to = new Date(options.queryParams.deadlineTo);
    expect(from).toEqual(new Date(from.getFullYear(), from.getMonth(), from.getDate()));
    expect(to).toEqual(new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7));
  });

  it('opens priority and status segments with their filters', () => {
    fixture.componentInstance.openPriority(0);
    expect(navigate).toHaveBeenLastCalledWith(['/tasks'], {
      queryParams: {
        view: 'list',
        assignee: '',
        project: 'project-1',
        state: '1,2',
        priority: '3',
      },
    });
    fixture.componentInstance.openStatus(0);
    expect(navigate).toHaveBeenLastCalledWith(['/tasks'], {
      queryParams: {
        view: 'list',
        assignee: '',
        project: 'project-1',
        state: '2',
      },
    });
  });

  it('does not open Others and opens Unassigned with assignee=none', () => {
    fixture.componentInstance.openWorkload(1);
    expect(navigate).not.toHaveBeenCalled();
    fixture.componentInstance.openWorkload(2);
    expect(navigate).toHaveBeenCalledWith(['/tasks'], {
      queryParams: {
        view: 'list',
        assignee: 'none',
        project: 'project-1',
        state: '1,2',
      },
    });
  });

  it('opens a ticket segment and a work item reference', () => {
    fixture.componentInstance.openSecondary(0);
    expect(navigate).toHaveBeenLastCalledWith(['/tasks'], {
      queryParams: {
        view: 'list',
        assignee: '',
        project: 'project-1',
        state: '1,2',
        ticket: 'ticket-1',
      },
    });
    fixture.componentInstance.openRef({
      projectId: 'project-1',
      workTicketId: 'ticket-1',
      workTaskId: 'task-1',
    });
    expect(navigate).toHaveBeenLastCalledWith([
      '/projects',
      'project-1',
      'tickets',
      'ticket-1',
      'tasks',
      'task-1',
    ]);
  });
});
