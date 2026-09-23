import { AuditUserModel } from '../audit-user.model';
import { DictionaryModel } from '../dictionary.model';
import { WorkItemAssigneeModel } from '../work-items';

export interface WorkTaskModel {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  milestoneId: string;
  milestoneTitle: string;
  groupId: string;
  groupTitle: string;
  workProjectId: string;
  workProject?: DictionaryModel<string> | null;
  workTicket: DictionaryModel<string>;
  parentWorkTask?: DictionaryModel<string> | null;
  isSubtask: boolean;
  status: DictionaryModel;
  priority: DictionaryModel;
  deadline?: string | null;
  /** When it last moved to Done. */
  doneAt?: string | null;
  assignee?: WorkItemAssigneeModel | null;
  subtaskCount: number;
  doneSubtaskCount: number;
  updatedAt?: string | null;
  updatedBy?: AuditUserModel | null;
}
