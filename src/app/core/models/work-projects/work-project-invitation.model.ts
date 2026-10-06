import { AuditUserModel } from '../audit-user.model';
import { WorkProjectRoleModel } from './work-project-role.model';

export interface WorkProjectInvitationModel extends AuditUserModel {
  email: string;
  role: WorkProjectRoleModel;
  createdAt: string;
}
