import { WorkTaskModel } from '../../core/models/work-tasks';
import { WorkItemMutationError } from '../../core/models/work-items';

export interface WorkTaskPageState {
  items: WorkTaskModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export interface WorkTasksState {
  pages: Record<string, WorkTaskPageState>;
  item: WorkTaskModel | null;
  detailLoading: boolean;
  detailError: string | null;
  saving: boolean;
  mutationError: WorkItemMutationError | null;
}

export const initialWorkTasksState: WorkTasksState = {
  pages: {},
  item: null,
  detailLoading: false,
  detailError: null,
  saving: false,
  mutationError: null,
};
