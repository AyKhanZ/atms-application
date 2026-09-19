import { GlobalSearchGroupModel } from './global-search-group.model';
import { GlobalSearchItemModel } from './global-search-item.model';

/** The search box's answer: a group per kind, and the recently opened items. */
export interface GlobalSearchModel {
  projects: GlobalSearchGroupModel;
  tickets: GlobalSearchGroupModel;
  tasks: GlobalSearchGroupModel;
  subtasks: GlobalSearchGroupModel;
  recent: GlobalSearchItemModel[];
}
