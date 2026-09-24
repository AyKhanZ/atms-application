import { ParamMap, Params } from '@angular/router';
import { WorkItemKind } from '../../core/models/work-items';
import {
  WorkTaskBoardFilter,
  WorkTaskBoardQuery,
  WorkTaskBoardOrder,
  WorkTaskBoardSort,
  emptyWorkTaskBoardFilter,
} from '../../core/models/work-task-board';
import { SortDirectionEnum } from '../../core/enums/sort-direction.enum';

export const defaultListOrder: WorkTaskBoardOrder = {
  sort: WorkTaskBoardSort.Title,
  direction: SortDirectionEnum.Asc,
};

export type TasksView = 'board' | 'calendar' | 'list';

/** What the page shows, as it lives in the address: view, filters and the calendar's month. */
export interface TasksPageState {
  view: TasksView;
  filter: WorkTaskBoardFilter;
  /** "2026-09" — the calendar's month. */
  month: string;
  order: WorkTaskBoardOrder;
}

/** Stand-ins in the address for the signed-in user and for "nobody". */
const me = 'me';
const none = 'none';
const lastStateKey = 'baim.tasks.last';

export function currentMonth(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Reads the page from its address. No filters at all means a first visit: the user's own work
 * across all projects, which is what most people open this page for.
 */
export function parseTasksPage(params: ParamMap, meId: string | null): TasksPageState {
  const list = (name: string) => (params.get(name) ?? '').split(',').filter(Boolean);
  const view = params.get('view');
  const people = params.has('assignee') ? list('assignee') : [me];
  const type = params.get('type');
  const month = params.get('month');
  const deadline = params.get('deadline');
  const sort = Number(params.get('sort'));

  return {
    view: view === 'calendar' || view === 'list' ? view : 'board',
    order: {
      sort: [
        WorkTaskBoardSort.Title,
        WorkTaskBoardSort.Code,
        WorkTaskBoardSort.State,
        WorkTaskBoardSort.Priority,
        WorkTaskBoardSort.Deadline,
      ].includes(sort)
        ? sort
        : defaultListOrder.sort,
      direction:
        Number(params.get('sortDirection')) === SortDirectionEnum.Desc
          ? SortDirectionEnum.Desc
          : SortDirectionEnum.Asc,
    },
    month: month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonth(),
    filter: {
      projectIds: list('project'),
      workTicketIds: list('ticket'),
      kind: type === 'task' ? WorkItemKind.Task : type === 'subtask' ? WorkItemKind.Subtask : null,
      assigneeUserIds: people
        .map((person) => (person === me ? meId : person))
        .filter((person): person is string => Boolean(person) && person !== none),
      unassigned: people.includes(none),
      statusIds: list('state').map(Number).filter(Number.isInteger),
      priorityIds: list('priority').map(Number).filter(Number.isInteger),
      deadline:
        deadline === 'overdue' || (deadline === none && view !== 'calendar') ? deadline : 'any',
      search: params.get('q') ?? '',
    },
  };
}

/** The address for a page state. The signed-in user is written as "me", so a shared link is
 *  "my tasks" for whoever opens it. An empty value is written too: "assignee=" means anyone. */
export function tasksPageParams(state: TasksPageState, meId: string | null): Params {
  const { filter } = state;
  const people = [
    ...filter.assigneeUserIds.map((person) => (person === meId ? me : person)),
    ...(filter.unassigned ? [none] : []),
  ];
  const join = (values: readonly (string | number)[]) => (values.length ? values.join(',') : null);

  return {
    view: state.view === 'board' ? null : state.view,
    sort: state.order.sort === defaultListOrder.sort ? null : state.order.sort,
    sortDirection: state.order.direction === SortDirectionEnum.Asc ? null : state.order.direction,
    month: state.view === 'calendar' ? state.month : null,
    project: join(filter.projectIds),
    ticket: join(filter.workTicketIds),
    type:
      filter.kind === WorkItemKind.Task
        ? 'task'
        : filter.kind === WorkItemKind.Subtask
          ? 'subtask'
          : null,
    assignee: people.join(','),
    state: join(filter.statusIds),
    priority: join(filter.priorityIds),
    deadline: filter.deadline === 'any' ? null : filter.deadline,
    q: filter.search.trim() || null,
  };
}

/** Anything narrower than "anyone's work in every project"? Decides whether Clear shows. */
export function hasFilters(filter: WorkTaskBoardFilter): boolean {
  return (
    filter.projectIds.length > 0 ||
    filter.workTicketIds.length > 0 ||
    filter.kind !== null ||
    filter.assigneeUserIds.length > 0 ||
    filter.unassigned ||
    filter.statusIds.length > 0 ||
    filter.priorityIds.length > 0 ||
    filter.deadline !== 'any' ||
    filter.search.trim().length > 0
  );
}

export function clearedFilter(): WorkTaskBoardFilter {
  return { ...emptyWorkTaskBoardFilter };
}

/** Stable text for a filter, used in store keys: the same filter always maps to the same lists. */
export function filterKey(query: WorkTaskBoardQuery): string {
  const sorted = (values: readonly (string | number)[]) => [...values].map(String).sort().join(',');
  return [
    sorted(query.projectIds),
    sorted(query.workTicketIds),
    query.kind ?? '',
    sorted(query.assigneeUserIds),
    query.unassigned ? 'u' : '',
    sorted(query.statusIds),
    sorted(query.priorityIds),
    query.search.trim().toLowerCase(),
    query.deadlineFrom ?? '',
    query.deadlineTo ?? '',
    query.noDeadline ? 'n' : '',
    query.deadline,
    query.overdue === undefined ? '' : query.overdue ? 'late' : 'on-time',
  ].join('|');
}

/** Remembers the last view and filters in this browser; best effort, storage may be off. */
export function rememberTasksPage(params: Params): void {
  try {
    localStorage.setItem(lastStateKey, JSON.stringify(params));
  } catch {
    // Private mode or blocked storage: the page still works, it just starts fresh next time.
  }
}

export function lastTasksPage(): Params | null {
  try {
    const value = localStorage.getItem(lastStateKey);
    const parsed: unknown = value ? JSON.parse(value) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Params) : null;
  } catch {
    return null;
  }
}
