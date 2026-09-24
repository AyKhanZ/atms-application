import { HistoryEntryModel } from './history-entry.model';

export interface HistoryPageModel {
  items: HistoryEntryModel[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
