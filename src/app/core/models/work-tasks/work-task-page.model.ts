import { WorkTaskModel } from './work-task.model';

export interface WorkTaskPageModel {
  items: WorkTaskModel[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
