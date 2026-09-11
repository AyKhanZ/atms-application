import { DictionaryModel } from '../../../core/models/dictionary.model';
import { WorkItemAssigneeModel } from '../../../core/models/work-items';

export interface WorkItemFacts {
  type?: DictionaryModel | null;
  priority: DictionaryModel;
  assignee?: WorkItemAssigneeModel | null;
  deadline?: string | null;
}
