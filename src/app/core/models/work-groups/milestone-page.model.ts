import { MilestoneOptionModel } from './milestone-option.model';

export interface MilestonePageModel {
  items: MilestoneOptionModel[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
