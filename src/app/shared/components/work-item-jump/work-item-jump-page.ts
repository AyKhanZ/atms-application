import { WorkItemJumpItem } from './work-item-jump-item';

export interface WorkItemJumpPage {
  items: WorkItemJumpItem[];
  hasMore: boolean;
  nextCursor?: string | null;
}
