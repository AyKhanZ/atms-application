import { GlobalSearchItemModel } from './global-search-item.model';

export interface GlobalSearchGroupModel {
  items: GlobalSearchItemModel[];
  hasMore: boolean;
}
