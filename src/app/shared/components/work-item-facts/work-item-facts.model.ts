import { DictionaryModel } from '../../../core/models/dictionary.model';
import { WorkItemAssigneeModel } from '../../../core/models/work-items';

export interface WorkItemFacts {
  type?: DictionaryModel | null;
  priority: DictionaryModel;
  assignee?: WorkItemAssigneeModel | null;
  deadline?: string | null;
  /** Done, closed or rejected: closed work is never overdue, whatever its date. */
  closed?: boolean;
}
