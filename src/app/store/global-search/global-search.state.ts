import { GlobalSearchItemModel, GlobalSearchModel } from '../../core/models/global-search';
import { WorkItemKind } from '../../core/models/work-items';

export const emptyGlobalSearchResult: GlobalSearchModel = {
  projects: { items: [], hasMore: false },
  tickets: { items: [], hasMore: false },
  tasks: { items: [], hasMore: false },
  subtasks: { items: [], hasMore: false },
  recent: [],
};

export interface GlobalSearchPageState {
  query: string;
  itemType: WorkItemKind;
  items: GlobalSearchItemModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export interface GlobalSearchState {
  popupQuery: string;
  popupResult: GlobalSearchModel;
  popupLoading: boolean;
  popupError: string | null;
  /**
   * Recently opened items, kept while the box stays open. Clearing the field shows them at once
   * instead of flashing the empty-state hint for the moment the request takes. Null until the
   * first answer: the box waits for it rather than drawing a hint that is replaced a blink later.
   */
  popupRecent: GlobalSearchItemModel[] | null;
  page: GlobalSearchPageState;
}

export const initialGlobalSearchState: GlobalSearchState = {
  popupQuery: '',
  popupResult: emptyGlobalSearchResult,
  popupLoading: false,
  popupError: null,
  popupRecent: null,
  page: {
    query: '',
    itemType: WorkItemKind.Task,
    items: [],
    nextCursor: null,
    hasMore: false,
    loading: false,
    error: null,
  },
};
