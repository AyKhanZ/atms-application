import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
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
  period: 30,
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
  activities: [],
};

describe('Dashboard navigation', () => {
  let fixture: ComponentFixture<Dashboard>;
  let store: MockStore;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const actions = new Subject<Action>();
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
              queryParamMap: convertToParamMap({ projectId: 'project-1', period: '30' }),
            },
            queryParamMap: NEVER,
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
