import { WorkTaskModel } from '../../core/models/work-tasks';
import { AuthStoreActions } from '../auth';
import * as Actions from './task-board.actions';
import { taskBoardReducer } from './task-board.reducer';
import { TaskBoardState, emptyTaskBoardPage, initialTaskBoardState } from './task-board.state';

const done = { id: 3, code: 'Done', name: 'Done' };

describe('taskBoardReducer', () => {
  it('moves a card across columns at the dropped spot and gives it the new status', () => {
    const state = taskBoardReducer(
      withPages({ new: ['1', '2'], done: ['3', '4'] }),
      Actions.moveTask({
        task: task('1'),
        from: 'new',
        to: 'done',
        index: 1,
        status: done,
        previousWorkTaskId: '3',
        nextWorkTaskId: '4',
        completeSubtasks: false,
      }),
    );

    expect(ids(state, 'new')).toEqual(['2']);
    expect(ids(state, 'done')).toEqual(['3', '1', '4']);
    expect(state.pages['done'].items[1].status).toEqual(done);
  });

  it('reorders a card within its own column', () => {
    const state = taskBoardReducer(
      withPages({ new: ['1', '2', '3'] }),
      Actions.moveTask({
        task: task('3'),
        from: 'new',
        to: 'new',
        index: 0,
        status: task('3').status,
        previousWorkTaskId: null,
        nextWorkTaskId: '1',
        completeSubtasks: false,
      }),
    );

    expect(ids(state, 'new')).toEqual(['3', '1', '2']);
  });

  it('moves a card to another calendar day with its new deadline', () => {
    const state = taskBoardReducer(
      withPages({ month: ['1', '2'] }),
      Actions.changeDeadline({
        task: task('1'),
        from: 'month',
        to: 'month',
        deadline: '2026-09-21T00:00:00.000Z',
      }),
    );

    expect(ids(state, 'month')).toEqual(['2', '1']);
    expect(state.pages['month'].items[1].deadline).toBe('2026-09-21T00:00:00.000Z');
  });

  it('keeps what a list shows while it is read again, and replaces it with the first page', () => {
    const loaded = withPages({ new: ['1'] });
    const reading = taskBoardReducer(loaded, loadPage(null));

    expect(ids(reading, 'new')).toEqual(['1']);
    expect(reading.pages['new'].loading).toBe(true);
    const answered = taskBoardReducer(
      reading,
      Actions.loadPageSuccess({
        key: 'new',
        append: false,
        page: { items: [task('2')], hasMore: false, nextCursor: null, pageSize: 20 },
      }),
    );
    expect(ids(answered, 'new')).toEqual(['2']);
  });

  it('drops every list the view no longer shows', () => {
    const state = taskBoardReducer(
      withPages({ old: ['1'], new: ['2'] }),
      Actions.keepPages({ keys: ['new'] }),
    );

    expect(Object.keys(state.pages)).toEqual(['new']);
  });

  it('forgets everything when the page closes or the session ends', () => {
    const loaded = withPages({ new: ['1'] });

    expect(taskBoardReducer(loaded, Actions.reset())).toEqual(initialTaskBoardState);
    expect(taskBoardReducer(loaded, AuthStoreActions.logoutCompleted())).toEqual(
      initialTaskBoardState,
    );
  });
});

function loadPage(cursor: string | null) {
  return Actions.loadPage({
    key: 'new',
    query: {
      projectIds: [],
      workTicketIds: [],
      kind: null,
      assigneeUserIds: [],
      unassigned: false,
      statusIds: [],
      priorityIds: [],
      deadline: 'any',
      search: '',
    },
    order: { sort: 1, direction: 1 },
    pageSize: 20,
    cursor,
  });
}

function withPages(pages: Record<string, string[]>): TaskBoardState {
  return {
    ...initialTaskBoardState,
    pages: Object.fromEntries(
      Object.entries(pages).map(([key, values]) => [
        key,
        { ...emptyTaskBoardPage, items: values.map(task) },
      ]),
    ),
  };
}

function ids(state: TaskBoardState, key: string): string[] {
  return state.pages[key].items.map((item) => item.id);
}

function task(id: string): WorkTaskModel {
  return {
    id,
    code: id,
    title: `Task ${id}`,
    workProjectId: 'project',
    workTicket: { id: 'ticket', code: '1', name: 'Ticket' },
    milestoneId: 'milestone',
    milestoneTitle: 'Milestone',
    groupId: 'group',
    groupTitle: 'Group',
    isSubtask: false,
    status: { id: 1, code: 'New', name: 'New' },
    priority: { id: 1, code: 'Low', name: 'Low' },
    subtaskCount: 0,
    doneSubtaskCount: 0,
  };
}
