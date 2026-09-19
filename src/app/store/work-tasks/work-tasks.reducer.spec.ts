import { AuthStoreActions } from '../auth';
import * as Actions from './work-tasks.actions';
import { workTasksReducer } from './work-tasks.reducer';
import { initialWorkTasksState } from './work-tasks.state';

describe('workTasksReducer', () => {
  it('appends subtasks without replacing the first page', () => {
    const initial = {
      ...initialWorkTasksState,
      pages: {
        subtasks: {
          items: [task('1')],
          nextCursor: 'next',
          hasMore: true,
          loading: true,
          error: null,
        },
      },
    };
    const state = workTasksReducer(
      initial,
      Actions.loadTasksSuccess({
        requestKey: 'subtasks',
        append: true,
        page: { items: [task('2')], nextCursor: null, hasMore: false, pageSize: 10 },
      }),
    );

    expect(state.pages['subtasks'].items.map((value) => value.id)).toEqual(['1', '2']);
  });

  it('removes only the requested page', () => {
    const state = workTasksReducer(
      {
        ...initialWorkTasksState,
        pages: {
          first: { items: [], nextCursor: null, hasMore: false, loading: false, error: null },
          second: { items: [], nextCursor: null, hasMore: false, loading: false, error: null },
        },
      },
      Actions.clearPage({ requestKey: 'first' }),
    );

    expect(state.pages['first']).toBeUndefined();
    expect(state.pages['second']).toBeDefined();
  });

  it('forgets every list when the session ends', () => {
    const state = workTasksReducer(
      initialWorkTasksState,
      Actions.loadTasks({
        requestKey: 'first',
        projectId: 'p',
        filter: {},
        append: false,
      }),
    );

    expect(workTasksReducer(state, AuthStoreActions.logoutCompleted())).toEqual(
      initialWorkTasksState,
    );
  });
});

function task(id: string) {
  return {
    id,
    code: id,
    title: `Task ${id}`,
    workProjectId: 'project',
    workTicketId: 'ticket',
    workTicketCode: '1',
    workTicketTitle: 'Ticket',
    milestoneId: 'milestone',
    milestoneTitle: 'Milestone',
    groupId: 'group',
    groupTitle: 'Group',
    isSubtask: true,
    status: { id: 1, code: 'New', name: 'New' },
    priority: { id: 1, code: 'Low', name: 'Low' },
    subtaskCount: 0,
    doneSubtaskCount: 0,
  };
}
