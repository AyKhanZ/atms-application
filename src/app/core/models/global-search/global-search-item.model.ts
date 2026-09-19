import { DictionaryModel } from '../dictionary.model';
import { WorkItemAssigneeModel, WorkItemKind } from '../work-items';
import { GlobalSearchLocationModel } from './global-search-location.model';

export interface GlobalSearchItemModel {
  itemType: WorkItemKind;
  id: string;
  code: string;
  title: string;
  project: DictionaryModel<string>;
  status: DictionaryModel;
  assignee?: WorkItemAssigneeModel | null;
  group?: GlobalSearchLocationModel | null;
  milestone?: GlobalSearchLocationModel | null;
  ticket?: DictionaryModel<string> | null;
  parentTask?: DictionaryModel<string> | null;
  openedAt?: string | null;
}
