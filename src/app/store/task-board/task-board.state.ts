import { WorkTaskBoardAssigneeModel } from '../../core/models/work-task-board';
import { WorkTaskModel } from '../../core/models/work-tasks';

/** One loaded list: a board column, the list view, or a calendar month. */
export interface TaskBoardPageState {
  items: WorkTaskModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export interface TaskBoardState {
  /** Keyed by what they show — view, filters, and the column or month. */
  pages: Record<string, TaskBoardPageState>;
  /** Status id to count under the current filters; null until loaded. */
  counts: Record<number, number> | null;
  assignees: WorkTaskBoardAssigneeModel[];
}

export const initialTaskBoardState: TaskBoardState = {
  pages: {},
  counts: null,
  assignees: [],
};

export const emptyTaskBoardPage: TaskBoardPageState = {
  items: [],
  nextCursor: null,
  hasMore: false,
  loading: false,
  error: null,
};
