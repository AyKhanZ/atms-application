import { HistoryEntryModel, HistoryStateModel } from '../../core/models/history';

export interface HistoryListState {
  items: HistoryEntryModel[];
  nextCursor: string | null;
  hasMore: boolean;
  // first page
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  // null until read or if it failed
  states: HistoryStateModel[] | null;
}

export interface HistoryState {
  // project:<id>, ticket:<id>, task:<id>
  lists: Record<string, HistoryListState>;
}

export const initialHistoryState: HistoryState = {
  lists: {},
};
