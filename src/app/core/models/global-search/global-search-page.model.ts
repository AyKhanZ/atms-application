import { GlobalSearchItemModel } from './global-search-item.model';

/** One page of a single kind on the search page. */
export interface GlobalSearchPageModel {
  items: GlobalSearchItemModel[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
