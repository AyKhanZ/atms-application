import { GlobalSearchGroupModel } from './global-search-group.model';
import { GlobalSearchItemModel } from './global-search-item.model';

export interface GlobalSearchModel {
  projects: GlobalSearchGroupModel;
  tickets: GlobalSearchGroupModel;
  tasks: GlobalSearchGroupModel;
  subtasks: GlobalSearchGroupModel;
  recent: GlobalSearchItemModel[];
}
