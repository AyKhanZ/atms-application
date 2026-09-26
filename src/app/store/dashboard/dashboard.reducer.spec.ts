import { AuthStoreActions } from '../auth';
import * as Actions from './dashboard.actions';
import { dashboardReducer } from './dashboard.reducer';
import { initialDashboardState } from './dashboard.state';
import { DashboardModel } from '../../core/models/dashboard';

const query = { projectId: null, period: '30d', from: null, to: null } as const;
const otherQuery = { projectId: 'project-1', period: '7d', from: null, to: null } as const;
const model: DashboardModel = {
  generatedAt: '2026-09-25T10:00:00Z',
  period: '30d',
  from: '2026-08-27',
  to: '2026-09-25',
  granularity: 'day',
  kpis: [],
  mainChart: { labels: [], series: [] },
  donuts: [],
  workload: null,
  secondaryChart: { key: 'byProject', segments: [] },
  deadlines: [],
  deadlineCount: 0,
  activities: [],
};

describe('dashboardReducer', () => {
  it('keeps the current data while refreshing the same filters', () => {
    const loaded = dashboardReducer(
      dashboardReducer(initialDashboardState, Actions.enter({ query })),
      Actions.loadSuccess({ query, model }),
    );
    const refreshing = dashboardReducer(loaded, Actions.load({ query }));
    expect(refreshing.model).toBe(model);
    expect(refreshing.loading).toBe(true);
  });

  it('drops old metrics when a filter changes and rejects a late response', () => {
    const loaded = dashboardReducer(
      dashboardReducer(initialDashboardState, Actions.enter({ query })),
      Actions.loadSuccess({ query, model }),
    );
    const changed = dashboardReducer(loaded, Actions.load({ query: otherQuery }));
    expect(changed.model).toBeNull();
    expect(dashboardReducer(changed, Actions.loadSuccess({ query, model }))).toBe(changed);
  });

  it('clears dashboard data and project options on leave and sign-out', () => {
    const active = dashboardReducer(initialDashboardState, Actions.enter({ query }));
    const withProjects = dashboardReducer(
      active,
      Actions.loadProjectsSuccess({
        options: [{ id: 'project-1', code: '1', title: 'One' }],
        groupProjectIds: ['project-1'],
      }),
    );
    expect(dashboardReducer(withProjects, Actions.leave())).toEqual(initialDashboardState);
    expect(dashboardReducer(withProjects, AuthStoreActions.logoutCompleted())).toEqual(
      initialDashboardState,
    );
  });
});
