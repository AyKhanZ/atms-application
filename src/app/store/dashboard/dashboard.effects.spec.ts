import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { WorkItemChangedEvent } from '../../core/models/realtime/work-item-changed.event';
import { DashboardService } from '../../core/services/dashboard.service';
import { DictionaryService } from '../../core/services/dictionary.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import { Features } from '../features.enum';
import * as Actions from './dashboard.actions';
import { DashboardEffects } from './dashboard.effects';
import { initialDashboardState } from './dashboard.state';

describe('DashboardEffects realtime', () => {
  let actions: Subject<Action>;
  let changes: Subject<WorkItemChangedEvent>;
  let reconnects: Subject<void>;
  let store: MockStore;
  let emitted: Action[];
  let joinProject: ReturnType<typeof vi.fn>;
  let leaveProject: ReturnType<typeof vi.fn>;
  let effects: DashboardEffects;

  beforeEach(() => {
    actions = new Subject<Action>();
    changes = new Subject<WorkItemChangedEvent>();
    reconnects = new Subject<void>();
    emitted = [];
    joinProject = vi.fn().mockResolvedValue(undefined);
    leaveProject = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        DashboardEffects,
        provideMockActions(() => actions),
        provideMockStore({
          initialState: {
            [Features.Dashboard]: {
              ...initialDashboardState,
              active: true,
              groupProjectIds: ['project-1'],
            },
          },
        }),
        {
          provide: RealtimeService,
          useValue: {
            workItemChanged$: changes,
            reconnected$: reconnects,
            joinProject,
            leaveProject,
          },
        },
        { provide: DashboardService, useValue: {} },
        { provide: WorkProjectsService, useValue: {} },
        { provide: DictionaryService, useValue: {} },
      ],
    });
    store = TestBed.inject(MockStore);
    effects = TestBed.inject(DashboardEffects);
    effects.workChanged$.subscribe((action) => emitted.push(action));
    effects.reconnected$.subscribe((action) => emitted.push(action));
    effects.groups$.subscribe();
  });

  it('refreshes visible dashboard for its project, but ignores another project', () => {
    changes.next({ projectId: 'another', entityType: 'task', id: '1', action: 'updated' });
    expect(emitted).toEqual([]);
    changes.next({ projectId: 'project-1', entityType: 'task', id: '1', action: 'updated' });
    expect(emitted).toEqual([Actions.refresh()]);
  });

  it('does not refresh while the tab is hidden', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      changes.next({ projectId: 'project-1', entityType: 'task', id: '1', action: 'updated' });
      reconnects.next();
      expect(emitted).toEqual([]);
    } finally {
      visibility.mockRestore();
    }
  });

  it('limits event-driven refreshes to one per ten seconds', () => {
    vi.useFakeTimers();
    try {
      const event: WorkItemChangedEvent = {
        projectId: 'project-1',
        entityType: 'task',
        id: '1',
        action: 'updated',
      };
      changes.next(event);
      changes.next(event);
      expect(emitted).toEqual([Actions.refresh()]);

      vi.advanceTimersByTime(9_999);
      expect(emitted).toEqual([Actions.refresh()]);
      vi.advanceTimersByTime(1);
      expect(emitted).toEqual([Actions.refresh(), Actions.refresh()]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshes after reconnect and switches project groups', () => {
    reconnects.next();
    expect(emitted).toEqual([Actions.refresh()]);
    actions.next(Actions.enter({ query: { projectId: null, period: '30d', from: null, to: null } }));
    expect(joinProject).toHaveBeenCalledWith('project-1');
    store.setState({
      [Features.Dashboard]: {
        ...initialDashboardState,
        active: true,
        query: { projectId: 'project-2', period: '30d', from: null, to: null },
        groupProjectIds: ['project-1'],
      },
    });
    actions.next(Actions.load({ query: { projectId: 'project-2', period: '30d', from: null, to: null } }));
    expect(leaveProject).toHaveBeenCalledWith('project-1');
    expect(joinProject).toHaveBeenCalledWith('project-2');
  });
});
