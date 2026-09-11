import { AuditUserModel } from '../audit-user.model';
import { DictionaryModel } from '../dictionary.model';
import { WorkItemAssigneeModel } from '../work-items';

export interface WorkTicketModel {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  workProjectId: string;
  milestoneId: string;
  milestoneTitle: string;
  groupId: string;
  groupTitle: string;
  workTicketType: DictionaryModel;
  workTicketStatus: DictionaryModel;
  priority: DictionaryModel;
  deadline?: string | null;
  assignee?: WorkItemAssigneeModel | null;
  updatedAt?: string | null;
  updatedBy?: AuditUserModel | null;
  totalTaskCount?: number;
  doneTaskCount?: number;
}
