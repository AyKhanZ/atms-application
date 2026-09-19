import { GlobalSearchItemModel } from './global-search-item.model';

/** The first few matches of one kind, and whether the search page has more. */
export interface GlobalSearchGroupModel {
  items: GlobalSearchItemModel[];
  hasMore: boolean;
}
