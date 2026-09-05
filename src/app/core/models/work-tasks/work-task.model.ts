import { AuditUserModel } from '../audit-user.model';
import { DictionaryModel } from '../dictionary.model';
import { WorkItemAssigneeModel } from '../work-items';

export interface WorkTaskModel {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  workProjectId: string;
  workTicketId: string;
  workTicketCode: string;
  workTicketTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  groupId: string;
  groupTitle: string;
  parentWorkTaskId?: string | null;
  parentWorkTaskCode?: string | null;
  parentWorkTaskTitle?: string | null;
  isSubtask: boolean;
  status: DictionaryModel;
  priority: DictionaryModel;
  deadline?: string | null;
  assignee?: WorkItemAssigneeModel | null;
  subtaskCount: number;
  doneSubtaskCount: number;
  updatedAt?: string | null;
  updatedBy?: AuditUserModel | null;
}
