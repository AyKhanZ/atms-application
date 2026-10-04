import { KeysetPageModel } from '../keyset-page.model';
import { GlobalSearchItemModel } from './global-search-item.model';

/** One page of a single kind on the search page. */
export interface GlobalSearchPageModel extends KeysetPageModel<GlobalSearchItemModel> {}
