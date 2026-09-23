import { convertToParamMap } from '@angular/router';
import { WorkItemKind } from '../../core/models/work-items';
import { emptyWorkTaskBoardFilter } from '../../core/models/work-task-board';
import {
  TasksPageState,
  defaultListOrder,
  clearedFilter,
  filterKey,
  hasFilters,
  parseTasksPage,
  tasksPageParams,
} from './tasks-page.utils';

const meId = 'user-me';

describe('tasks page address', () => {
  it('opens on the board with the signed-in user’s own work', () => {
    const state = parseTasksPage(convertToParamMap({}), meId);

    expect(state.view).toBe('board');
    expect(state.filter.assigneeUserIds).toEqual([meId]);
    expect(state.filter.unassigned).toBe(false);
  });

  it('reads an empty assignee as anyone', () => {
    const state = parseTasksPage(convertToParamMap({ assignee: '' }), meId);

    expect(state.filter.assigneeUserIds).toEqual([]);
    expect(hasFilters(state.filter)).toBe(false);
  });

  it('survives a round trip through the address', () => {
    const state: TasksPageState = {
      view: 'calendar',
      month: '2026-10',
      order: defaultListOrder,
      filter: {
        projectIds: ['p1'],
        workTicketIds: ['t1'],
        kind: WorkItemKind.Subtask,
        assigneeUserIds: [meId, 'user-2'],
        unassigned: true,
        statusIds: [1, 2],
        priorityIds: [3],
        deadline: 'overdue',
        search: 'login',
      },
    };

    const params = tasksPageParams(state, meId);

    expect(params['assignee']).toBe('me,user-2,none');
    expect(parseTasksPage(convertToParamMap(params), meId)).toEqual(state);
  });

  it('writes "me" so a shared link shows the work of whoever opens it', () => {
    const params = tasksPageParams(
      { view: 'board', month: '2026-09', order: defaultListOrder, filter: clearedFilter() },
      meId,
    );
    const state = parseTasksPage(convertToParamMap({ ...params, assignee: 'me' }), 'someone-else');

    expect(state.filter.assigneeUserIds).toEqual(['someone-else']);
  });

  it('ignores a broken month and an unknown deadline', () => {
    const state = parseTasksPage(convertToParamMap({ month: 'soon', deadline: 'someday' }), meId);

    expect(state.month).toMatch(/^\d{4}-\d{2}$/);
    expect(state.filter.deadline).toBe('any');
    expect(tasksPageParams(state, meId)['deadline']).toBeNull();
  });

  it('counts a deadline choice as a filter', () => {
    expect(hasFilters({ ...clearedFilter(), deadline: 'none' })).toBe(true);
  });

  it('normalizes a calendar URL with no deadline without losing other filters', () => {
    const state = parseTasksPage(
      convertToParamMap({ view: 'calendar', deadline: 'none', project: 'p1', q: 'search' }),
      meId,
    );
    expect(state.filter.deadline).toBe('any');
    expect(state.filter.projectIds).toEqual(['p1']);
    expect(state.filter.search).toBe('search');
    expect(tasksPageParams(state, meId)['deadline']).toBeNull();
  });

  it.each([3, 4, 5, 6, 7])('round trips list sort %s and direction', (sort) => {
    const state = parseTasksPage(convertToParamMap({ view: 'list', sort, sortDirection: 2 }), meId);
    expect(state.order).toEqual({ sort, direction: 2 });
    expect(parseTasksPage(convertToParamMap(tasksPageParams(state, meId)), meId)).toEqual(state);
  });
});

describe('filterKey', () => {
  it('is the same whatever order the values were picked in', () => {
    const first = { ...emptyWorkTaskBoardFilter, projectIds: ['a', 'b'], statusIds: [2, 1] };
    const second = { ...emptyWorkTaskBoardFilter, projectIds: ['b', 'a'], statusIds: [1, 2] };

    expect(filterKey(first)).toBe(filterKey(second));
  });

  it('tells a month apart from the whole board', () => {
    const month = { ...emptyWorkTaskBoardFilter, deadlineFrom: '2026-09-01' };

    expect(filterKey(month)).not.toBe(filterKey(emptyWorkTaskBoardFilter));
  });
});
