import { AuditUserModel } from '../audit-user.model';
import { DictionaryModel } from '../dictionary.model';
import { WorkTicketAssigneeModel } from './work-ticket-assignee.model';

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
  assignee?: WorkTicketAssigneeModel | null;
  updatedAt?: string | null;
  updatedBy?: AuditUserModel | null;
}
