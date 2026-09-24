import { HistoryEntryModel, HistoryStateModel } from '../../core/models/history';

export interface HistoryListState {
  items: HistoryEntryModel[];
  nextCursor: string | null;
  hasMore: boolean;
  /** The first page. */
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  /** How the status changed; null until read, or when it could not be read. */
  states: HistoryStateModel[] | null;
}

export interface HistoryState {
  /** By history key: `project:<id>`, `ticket:<id>`, `task:<id>`. */
  lists: Record<string, HistoryListState>;
}

export const initialHistoryState: HistoryState = {
  lists: {},
};
