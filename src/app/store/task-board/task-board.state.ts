import { WorkTaskBoardAssigneeModel } from '../../core/models/work-task-board';
import { WorkTaskModel } from '../../core/models/work-tasks';

// board column, list view or calendar month
export interface TaskBoardPageState {
  items: WorkTaskModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export interface TaskBoardState {
  // keyed by view, filters and column or month
  pages: Record<string, TaskBoardPageState>;
  // null until loaded
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
