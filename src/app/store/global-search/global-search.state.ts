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
  // kept while the box is open so clearing the field shows them at once
  // null until the first answer, the box waits instead of flashing the hint
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
